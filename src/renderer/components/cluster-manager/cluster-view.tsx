/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import "./cluster-view.scss";
import React from "react";
import type { IComputedValue } from "mobx";
import { when, computed, makeObservable, reaction } from "mobx";
import { disposeOnUnmount, observer } from "mobx-react";
import { ClusterStatus } from "./cluster-status";
import type { ClusterFrameHandler } from "./lens-views";
import type { Cluster } from "../../../common/cluster/cluster";
import type { ClusterStore } from "../../../common/cluster-store/cluster-store";
import { requestClusterActivation } from "../../ipc";
import { withInjectables } from "@ogre-tools/injectable-react";
import type { NavigateToCatalog } from "../../../common/front-end-routing/routes/catalog/navigate-to-catalog.injectable";
import navigateToCatalogInjectable from "../../../common/front-end-routing/routes/catalog/navigate-to-catalog.injectable";
import clusterViewRouteParametersInjectable from "./cluster-view-route-parameters.injectable";
import clusterFramesInjectable from "./lens-views.injectable";
import type { CatalogEntityRegistry } from "../../api/catalog/entity/registry";
import catalogEntityRegistryInjectable from "../../api/catalog/entity/registry.injectable";
import type { ClusterConnectionStatusState } from "./cluster-status.state.injectable";
import clusterConnectionStatusStateInjectable from "./cluster-status.state.injectable";
import clusterStoreInjectable from "../../../common/cluster-store/cluster-store.injectable";

interface Dependencies {
  clusterId: IComputedValue<string>;
  clusterFrames: ClusterFrameHandler;
  navigateToCatalog: NavigateToCatalog;
  entityRegistry: CatalogEntityRegistry;
  clusterConnectionStatusState: ClusterConnectionStatusState;
  clusterStore: ClusterStore;
}

@observer
class NonInjectedClusterView extends React.Component<Dependencies> {
  constructor(props: Dependencies) {
    super(props);
    makeObservable(this);
  }

  get clusterId() {
    return this.props.clusterId.get();
  }

  @computed get cluster(): Cluster | undefined {
    return this.props.clusterStore.getById(this.clusterId);
  }

  private readonly isViewLoaded = computed(() => this.props.clusterFrames.hasLoadedView(this.clusterId), {
    keepAlive: true,
    requiresReaction: true,
  });

  @computed get isReady(): boolean {
    const { cluster } = this;

    return (cluster?.ready && cluster?.available && this.isViewLoaded.get()) ?? false;
  }

  componentDidMount() {
    this.bindEvents();
  }

  componentWillUnmount() {
    this.props.clusterFrames.clearVisibleCluster();
    this.props.entityRegistry.activeEntity = undefined;
  }

  bindEvents() {
    disposeOnUnmount(this, [
      reaction(() => this.clusterId, async (clusterId) => {
        this.props.clusterFrames.setVisibleCluster(clusterId);
        this.props.clusterFrames.initView(clusterId);
        requestClusterActivation(clusterId, false); // activate and fetch cluster's state from main
        this.props.entityRegistry.activeEntity = clusterId;

        disposeOnUnmount(this, [
          when(
            () => {
              const cluster = this.props.clusterStore.getById(clusterId);

              if (!cluster) {
                return true;
              }

              return (
                cluster.ready && cluster.available && this.props.clusterFrames.hasLoadedView(clusterId)
              ) || (
                cluster.disconnected // covers manual disconnection before connection
              );
            },
            () => {
              const state = this.props.clusterConnectionStatusState.forCluster(clusterId);

              state.clearReconnectingState();
              state.resetAuthOutput();
            },
          ),
        ]);
      }, {
        fireImmediately: true,
      }),

      reaction(() => [this.cluster?.ready, this.cluster?.disconnected], ([, disconnected]) => {
        if (this.isViewLoaded.get() && disconnected) {
          this.props.navigateToCatalog(); // redirect to catalog when active cluster get disconnected/not available
        }
      }),
    ]);
  }

  renderStatus(): React.ReactNode {
    const { cluster, isReady } = this;

    if (cluster && !isReady) {
      return <ClusterStatus cluster={cluster} className="box center"/>;
    }

    return null;
  }

  render() {
    return (
      <div className="ClusterView flex column align-center">
        {this.renderStatus()}
      </div>
    );
  }
}

export const ClusterView = withInjectables<Dependencies>(NonInjectedClusterView, {
  getProps: (di) => ({
    clusterId: di.inject(clusterViewRouteParametersInjectable).clusterId,
    navigateToCatalog: di.inject(navigateToCatalogInjectable),
    clusterFrames: di.inject(clusterFramesInjectable),
    entityRegistry: di.inject(catalogEntityRegistryInjectable),
    clusterConnectionStatusState: di.inject(clusterConnectionStatusStateInjectable),
    clusterStore: di.inject(clusterStoreInjectable),
  }),
});

