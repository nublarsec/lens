/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { LensRendererExtension } from "../../../extensions/lens-renderer-extension";
import rendererExtensionsInjectable from "../../../extensions/renderer-extensions.injectable";
import currentlyInClusterFrameInjectable from "../../routes/currently-in-cluster-frame.injectable";
import { extensionRegistratorInjectionToken } from "../../../extensions/extension-loader/extension-registrator-injection-token";
import type { IObservableArray } from "mobx";
import { action, computed, observable, runInAction } from "mobx";
import { renderFor } from "./renderFor";
import observableHistoryInjectable from "../../navigation/observable-history.injectable";
import React from "react";
import { Router } from "react-router-dom";
import { Observer } from "mobx-react";
import subscribeStoresInjectable from "../../kube-watch-api/subscribe-stores.injectable";
import allowedResourcesInjectable from "../../../common/cluster-store/allowed-resources.injectable";
import type { RenderResult } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { KubeResource } from "../../../common/rbac";
import { Sidebar } from "../layout/sidebar";
import { getDisForUnitTesting } from "../../../test-utils/get-dis-for-unit-testing";
import type { DiContainer } from "@ogre-tools/injectable";
import clusterStoreInjectable from "../../../common/cluster-store/cluster-store.injectable";
import type { ClusterStore } from "../../../common/cluster-store/cluster-store";
import mainExtensionsInjectable from "../../../extensions/main-extensions.injectable";
import type { LensMainExtension } from "../../../extensions/lens-main-extension";
import currentRouteComponentInjectable from "../../routes/current-route-component.injectable";
import { pipeline } from "@ogre-tools/fp";
import { flatMap, compact, join, get, filter, find, map, matches } from "lodash/fp";
import preferenceNavigationItemsInjectable from "../+preferences/preferences-navigation/preference-navigation-items.injectable";
import navigateToPreferencesInjectable from "../../../common/front-end-routing/routes/preferences/navigate-to-preferences.injectable";
import type { MenuItemOpts } from "../../../main/menu/application-menu-items.injectable";
import applicationMenuItemsInjectable from "../../../main/menu/application-menu-items.injectable";
import navigateToHelmChartsInjectable from "../../../common/front-end-routing/routes/cluster/helm/charts/navigate-to-helm-charts.injectable";
import hostedClusterInjectable from "../../../common/cluster-store/hosted-cluster.injectable";
import { ClusterFrameContext } from "../../cluster-frame-context/cluster-frame-context";
import type { Cluster } from "../../../common/cluster/cluster";
import type { NamespaceStore } from "../+namespaces/namespace-store/namespace.store";
import { KubeObjectStore } from "../../../common/k8s-api/kube-object.store";
import namespaceStoreInjectable from "../+namespaces/namespace-store/namespace-store.injectable";
import clusterFrameContextInjectable from "../../cluster-frame-context/cluster-frame-context.injectable";
import startMainApplicationInjectable from "../../../main/start-main-application/start-main-application.injectable";
import startFrameInjectable from "../../start-frame/start-frame.injectable";
import { flushPromises } from "../../../common/test-utils/flush-promises";
import trayMenuItemsInjectable from "../../../main/tray/tray-menu-item/tray-menu-items.injectable";
import type { TrayMenuItem } from "../../../main/tray/tray-menu-item/tray-menu-item-injection-token";
import updateIsAvailableStateInjectable from "../../../main/update-app/update-is-ready-to-be-installed-state.injectable";

type Callback = (dis: DiContainers) => void | Promise<void>;

export interface ApplicationBuilder {
  dis: DiContainers;
  setEnvironmentToClusterFrame: () => ApplicationBuilder;
  addExtensions: (...extensions: LensRendererExtension[]) => Promise<ApplicationBuilder>;
  allowKubeResource: (resourceName: KubeResource) => ApplicationBuilder;
  beforeApplicationStart: (callback: Callback) => ApplicationBuilder;
  beforeRender: (callback: Callback) => ApplicationBuilder;
  render: () => Promise<RenderResult>;

  applicationUpdater: {
    setUpdateIsReadyToBeInstalled: (available: boolean) => void;
  };

  tray: {
    click: (id: string) => Promise<void>;
    get: (id: string) => TrayMenuItem | undefined;
  };

  applicationMenu: {
    click: (path: string) => Promise<void>;
  };

  preferences: {
    close: () => void;
    navigate: () => void;
    navigation: {
      click: (id: string) => void;
    };
  };

  helmCharts: {
    navigate: () => void;
  };
}

interface DiContainers {
  rendererDi: DiContainer;
  mainDi: DiContainer;
}

interface Environment {
  renderSidebar: () => React.ReactNode;
  onAllowKubeResource: () => void;
}

export const getApplicationBuilder = () => {
  const { rendererDi, mainDi } = getDisForUnitTesting({
    doGeneralOverrides: true,
  });

  const dis = { rendererDi, mainDi };

  const clusterStoreStub = {
    provideInitialFromMain: () => {},
    getById: (): null => null,
  } as unknown as ClusterStore;

  rendererDi.override(clusterStoreInjectable, () => clusterStoreStub);
  mainDi.override(clusterStoreInjectable, () => clusterStoreStub);

  const beforeApplicationStartCallbacks: Callback[] = [];
  const beforeRenderCallbacks: Callback[] = [];

  const extensionsState = observable.array<LensRendererExtension>();

  rendererDi.override(subscribeStoresInjectable, () => () => () => {});

  const environments: Record<string, Environment> = {
    application: {
      renderSidebar: () => null,

      onAllowKubeResource: () => {
        throw new Error(
          "Tried to allow kube resource when environment is not cluster frame.",
        );
      },
    },

    clusterFrame: {
      renderSidebar: () => <Sidebar />,
      onAllowKubeResource: () => {},
    },
  };

  let environment = environments.application;

  rendererDi.override(
    currentlyInClusterFrameInjectable,
    () => environment === environments.clusterFrame,
  );

  rendererDi.override(rendererExtensionsInjectable, () =>
    computed(() => extensionsState),
  );

  mainDi.override(mainExtensionsInjectable, () =>
    computed((): LensMainExtension[] => []),
  );

  let allowedResourcesState: IObservableArray<KubeResource>;
  let rendered: RenderResult;

  const builder: ApplicationBuilder = {
    dis,

    applicationUpdater: {
      setUpdateIsReadyToBeInstalled: action((available: boolean) => {
        const updateIsAvailableState = mainDi.inject(updateIsAvailableStateInjectable);

        updateIsAvailableState.set(available);
      }),
    },

    applicationMenu: {
      click: async (path: string) => {
        const applicationMenuItems = mainDi.inject(
          applicationMenuItemsInjectable,
        );

        const menuItems = pipeline(
          applicationMenuItems.get(),
          flatMap(toFlatChildren(null)),
          filter((menuItem) => !!menuItem.click),
        );

        const menuItem = menuItems.find((menuItem) => menuItem.path === path);

        if (!menuItem) {
          const availableIds = menuItems.map(get("path")).join('", "');

          throw new Error(
            `Tried to click application menu item with ID "${path}" which does not exist. Available IDs are: "${availableIds}"`,
          );
        }

        menuItem.click(undefined, undefined, undefined);

        await flushPromises();
      },
    },

    tray: {
      get: (id: string) => {
        const trayMenuItems = mainDi.inject(
          trayMenuItemsInjectable,
        );

        return trayMenuItems.get().find(matches({ id }));
      },

      click: async (id: string) => {
        const trayMenuItems = mainDi.inject(
          trayMenuItemsInjectable,
        );

        const menuItem = pipeline(
          trayMenuItems.get(),
          find((menuItem) => menuItem.id === id),
        );

        if (!menuItem) {
          const availableIds = pipeline(
            trayMenuItems.get(),
            filter(item => !!item.click),
            map(item => item.id),
            join(", "),
          );

          throw new Error(`Tried to click tray menu item with ID ${id} which does not exist. Available IDs are: "${availableIds}"`);
        }

        await menuItem.click();
      },
    },

    preferences: {
      close: () => {
        const link = rendered.getByTestId("close-preferences");

        fireEvent.click(link);
      },

      navigate: () => {
        const navigateToPreferences = rendererDi.inject(navigateToPreferencesInjectable);

        navigateToPreferences();
      },

      navigation: {
        click: (id: string) => {
          const link = rendered.queryByTestId(`tab-link-for-${id}`);

          if (!link) {
            const preferencesNavigationItems = rendererDi.inject(
              preferenceNavigationItemsInjectable,
            );

            const availableIds = preferencesNavigationItems
              .get()
              .map(get("id"));

            throw new Error(
              `Tried to click navigation item "${id}" which does not exist in preferences. Available IDs are "${availableIds.join(
                '", "',
              )}"`,
            );
          }

          fireEvent.click(link);
        },
      },
    },

    helmCharts: {
      navigate: () => {
        const navigateToHelmCharts = rendererDi.inject(navigateToHelmChartsInjectable);

        navigateToHelmCharts();
      },
    },

    setEnvironmentToClusterFrame: () => {
      environment = environments.clusterFrame;

      allowedResourcesState = observable.array();

      rendererDi.override(allowedResourcesInjectable, () =>
        computed(() => new Set([...allowedResourcesState])),
      );

      const clusterStub = {
        accessibleNamespaces: [],
      } as Cluster;

      const namespaceStoreStub = {} as NamespaceStore;

      const clusterFrameContextFake = new ClusterFrameContext(
        clusterStub,

        {
          namespaceStore: namespaceStoreStub,
        },
      );

      rendererDi.override(namespaceStoreInjectable, () => namespaceStoreStub);
      rendererDi.override(hostedClusterInjectable, () => clusterStub);
      rendererDi.override(clusterFrameContextInjectable, () => clusterFrameContextFake);

      // Todo: get rid of global state.
      KubeObjectStore.defaultContext.set(clusterFrameContextFake);

      return builder;
    },

    addExtensions: async (...extensions) => {
      const extensionRegistrators = rendererDi.injectMany(
        extensionRegistratorInjectionToken,
      );

      const addAndEnableExtensions = async () => {
        const registratorPromises = extensions.flatMap((extension) =>
          extensionRegistrators.map((registrator) => registrator(extension, 1)),
        );

        await Promise.all(registratorPromises);

        runInAction(() => {
          extensions.forEach((extension) => {
            extensionsState.push(extension);
          });
        });
      };

      if (rendered) {
        await addAndEnableExtensions();
      } else {
        builder.beforeRender(addAndEnableExtensions);
      }

      return builder;
    },

    allowKubeResource: (resourceName) => {
      environment.onAllowKubeResource();

      runInAction(() => {
        allowedResourcesState.push(resourceName);
      });

      return builder;
    },

    beforeApplicationStart(callback: (dis: DiContainers) => void) {
      beforeApplicationStartCallbacks.push(callback);

      return builder;
    },

    beforeRender(callback: (dis: DiContainers) => void) {
      beforeRenderCallbacks.push(callback);

      return builder;
    },

    async render() {
      for (const callback of beforeApplicationStartCallbacks) {
        await callback(dis);
      }

      const startMainApplication = mainDi.inject(startMainApplicationInjectable);

      await startMainApplication();

      const startFrame = rendererDi.inject(startFrameInjectable);

      await startFrame();

      const render = renderFor(rendererDi);

      const history = rendererDi.inject(observableHistoryInjectable);

      const currentRouteComponent = rendererDi.inject(
        currentRouteComponentInjectable,
      );

      for (const callback of beforeRenderCallbacks) {
        await callback(dis);
      }

      rendered = render(
        <Router history={history}>
          {environment.renderSidebar()}

          <Observer>
            {() => {
              const Component = currentRouteComponent.get();

              if (!Component) {
                return null;
              }

              return <Component />;
            }}
          </Observer>
        </Router>,
      );

      return rendered;
    },
  };

  return builder;
};

const toFlatChildren =
  (parentId: string) =>
    ({
      submenu = [],
      ...menuItem
    }: MenuItemOpts): (MenuItemOpts & { path: string })[] =>
      [
        {
          ...menuItem,
          path: pipeline([parentId, menuItem.id], compact, join(".")),
        },
        ...submenu.flatMap(toFlatChildren(menuItem.id)),
      ];
