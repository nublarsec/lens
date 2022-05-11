/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import type { RenderResult } from "@testing-library/react";
import type { ApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import { getApplicationBuilder } from "../../renderer/components/test-utils/get-application-builder";
import userStoreInjectable from "../../common/user-store/user-store.injectable";
import type { UserStore } from "../../common/user-store";
import themeStoreInjectable from "../../renderer/theme-store.injectable";
import type { ThemeStore } from "../../renderer/theme.store";
import type { LensRendererExtension } from "../../extensions/lens-renderer-extension";
import React from "react";
import { getRendererExtensionFake } from "../../renderer/components/test-utils/get-renderer-extension-fake";
import "@testing-library/jest-dom/extend-expect";

describe("preferences - navigation to extension specific preferences", () => {
  let applicationBuilder: ApplicationBuilder;

  beforeEach(() => {
    applicationBuilder = getApplicationBuilder();

    applicationBuilder.beforeSetups(({ rendererDi }) => {
      const userStoreStub = {
        extensionRegistryUrl: { customUrl: "some-custom-url" },
      } as unknown as UserStore;

      rendererDi.override(userStoreInjectable, () => userStoreStub);

      const themeStoreStub = { themeOptions: [] } as unknown as ThemeStore;

      rendererDi.override(themeStoreInjectable, () => themeStoreStub);
    });
  });

  describe("given in preferences, when rendered", () => {
    let rendered: RenderResult;

    beforeEach(async () => {
      applicationBuilder.beforeRender(() => {
        applicationBuilder.preferences.navigate();
      });

      rendered = await applicationBuilder.render();
    });

    it("renders", () => {
      expect(rendered.container).toMatchSnapshot();
    });

    it("does not show extension preferences yet", () => {
      const page = rendered.queryByTestId("extension-preferences-page");

      expect(page).toBeNull();
    });

    it("does not show link for extension preferences", () => {
      const actual = rendered.queryByTestId("tab-link-for-extensions");

      expect(actual).toBeNull();
    });

    describe("given multiple extensions with specific preferences, when navigating to extension specific preferences page", () => {
      beforeEach(async () => {
        const someTestExtension = getRendererExtensionFake(extensionStubWithExtensionSpecificPreferenceItems);
        const someOtherTestExtension = getRendererExtensionFake(someOtherExtensionStubWithExtensionSpecificPreferenceItems);

        await applicationBuilder.addExtensions(someTestExtension, someOtherTestExtension);
        applicationBuilder.preferences.navigation.click("extension-some-test-extension-id");
      });

      it("renders", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("doesn't show preferences from unrelated extension", () => {
        const actual = rendered.queryByTestId("extension-preference-item-for-some-other-preference-item-id");

        expect(actual).toBeNull();
      });

      it("shows preferences from related extension", () => {
        const actual = rendered.getByTestId("extension-preference-item-for-some-preference-item-id");

        expect(actual).not.toBeNull();
      });
    });

    describe("given multiple extensions with and without specific preferences, when navigating to extension specific preferences page", () => {
      beforeEach(async () => {
        const someTestExtension = getRendererExtensionFake(extensionStubWithExtensionSpecificPreferenceItems);
        const extensionWithoutPreferences = getRendererExtensionFake(extensionStubWithoutPreferences);
        const extensionWithSpecificTab = getRendererExtensionFake(extensionStubWithShowInPreferencesTab);

        await applicationBuilder.addExtensions(someTestExtension, extensionWithoutPreferences, extensionWithSpecificTab);
      });

      it("doesn't show link for extension without preferences", () => {
        const actual = rendered.queryByTestId("tab-link-for-extension-without-preferences-id");

        expect(actual).toBeNull();
      });

      it("doesn't show link for preferences with 'showInPreferencesTab' param", () => {
        const actual = rendered.queryByTestId("tab-link-for-extension-specified-preferences-page-id");

        expect(actual).toBeNull();
      });
    });

    describe("when extension with specific preferences is enabled", () => {
      beforeEach(async () => {
        const testExtension = getRendererExtensionFake(extensionStubWithExtensionSpecificPreferenceItems);

        await applicationBuilder.addExtensions(testExtension);
      });

      it("renders", () => {
        expect(rendered.container).toMatchSnapshot();
      });

      it("shows link for extension preferences", () => {
        const actual = rendered.getByTestId("tab-link-for-extension-some-test-extension-id");

        expect(actual).not.toBeNull();
      });

      it("link doesn't have 'active' class", () => {
        const actual = rendered.getByTestId("tab-link-for-extension-some-test-extension-id");

        expect(actual).not.toHaveClass("active");
      });

      describe("when navigating to extension preferences using navigation", () => {
        beforeEach(() => {
          applicationBuilder.preferences.navigation.click("extension-some-test-extension-id");
        });

        it("renders", () => {
          expect(rendered.container).toMatchSnapshot();
        });

        it("shows extension specific preferences", () => {
          const page = rendered.getByTestId("extension-preferences-page");

          expect(page).not.toBeNull();
        });

        it("shows extension specific preference item", () => {
          const actual = rendered.getByTestId("extension-preference-item-for-some-preference-item-id");

          expect(actual).not.toBeNull();
        });

        it("does not show unrelated preference tab items", () => {
          const actual = rendered.queryByTestId("extension-preference-item-for-some-unrelated-preference-item-id");

          expect(actual).toBeNull();
        });

        it("link does have 'active' class", () => {
          const actual = rendered.getByTestId("tab-link-for-extension-some-test-extension-id");

          expect(actual).toHaveClass("active");
        });
      });
    });

    describe("given extension with registered tab", () => {
      beforeEach(async () => {
        const extension = getRendererExtensionFake(extensionStubWithWithRegisteredTab);

        await applicationBuilder.addExtensions(extension);
      });

      it("shows extension tab in general area", () => {
        const actual = rendered.getByTestId("tab-link-for-extension-registered-tab-page-id-nav-item-metrics-extension-tab");

        expect(actual).toMatchSnapshot();
      });

      it("does not show custom settings block", () => {
        const actual = rendered.queryByTestId("extension-settings");

        expect(actual).not.toBeInTheDocument();
      });

      describe("when navigating to specific extension tab", () => {
        beforeEach(() => {
          applicationBuilder.preferences.navigation.click("extension-registered-tab-page-id-nav-item-metrics-extension-tab");
        });
        it("renders", () => {
          expect(rendered.container).toMatchSnapshot();
        });
        it("shows related preferences for this tab", () => {
          const actual = rendered.getByTestId("metrics-preference-item-hint");

          expect(actual).toBeInTheDocument();
        });
        it("does not show unrelated preferences for this tab", () => {
          const actual = rendered.queryByTestId("survey-preference-item-hint");

          expect(actual).not.toBeInTheDocument();
        });
      });
    });

    describe("given extension with few registered tabs", () => {
      beforeEach(async () => {
        const extension = getRendererExtensionFake(extensionStubWithWithRegisteredTabs);

        await applicationBuilder.addExtensions(extension);
      });

      it("shows each of registered tabs in general area", () => {
        const helloTab = rendered.getByTestId("tab-link-for-extension-hello-world-tab-page-id-nav-item-hello-extension-tab");
        const logsTab = rendered.getByTestId("tab-link-for-extension-hello-world-tab-page-id-nav-item-logs-extension-tab");

        expect(helloTab).toBeInTheDocument();
        expect(logsTab).toBeInTheDocument();
      });
    });

    describe("given extensions with tabs having same id", () => {
      beforeEach(async () => {
        const extension = getRendererExtensionFake(extensionStubWithWithRegisteredTab);
        const otherExtension = getRendererExtensionFake(extensionStubWithWithSameRegisteredTab);

        await applicationBuilder.addExtensions(extension, otherExtension);
      });

      it("shows tab from the first extension", () => {
        const actual = rendered.getByTestId("tab-link-for-extension-registered-tab-page-id-nav-item-metrics-extension-tab");

        expect(actual).toBeInTheDocument();
      });

      it("shows tab from the second extension", () => {
        const actual = rendered.getByTestId("tab-link-for-extension-duplicated-tab-page-id-nav-item-metrics-extension-tab");

        expect(actual).toBeInTheDocument();
      });

      describe("when navigating to first extension tab", () => {
        beforeEach(() => {
          applicationBuilder.preferences.navigation.click("extension-registered-tab-page-id-nav-item-metrics-extension-tab");
        });

        it("renders", () => {
          expect(rendered.container).toMatchSnapshot();
        });

        it("shows related preferences for this tab", () => {
          const actual = rendered.getByTestId("metrics-preference-item-hint");

          expect(actual).toBeInTheDocument();
        });

        it("does not show unrelated preferences for this tab", () => {
          const actual = rendered.queryByTestId("another-metrics-preference-item-hint");

          expect(actual).not.toBeInTheDocument();
        });
      });

      describe("when navigating to second extension tab", () => {
        beforeEach(() => {
          applicationBuilder.preferences.navigation.click("extension-duplicated-tab-page-id-nav-item-metrics-extension-tab");
        });

        it("renders", () => {
          expect(rendered.container).toMatchSnapshot();
        });

        it("shows related preferences for this tab", () => {
          const actual = rendered.getByTestId("another-metrics-preference-item-hint");

          expect(actual).toBeInTheDocument();
        });

        it("does not show unrelated preferences for this tab", () => {
          const actual = rendered.queryByTestId("metrics-preference-item-hint");

          expect(actual).not.toBeInTheDocument();
        });
      });
    });
  });
});

const extensionStubWithExtensionSpecificPreferenceItems: Partial<LensRendererExtension> = {
  id: "some-test-extension-id",

  appPreferences: [
    {
      title: "Some preference item",
      id: "some-preference-item-id",

      components: {
        Hint: () => <div data-testid="some-preference-item-hint" />,
        Input: () => <div data-testid="some-preference-item-input" />,
      },
    },

    {
      title: "irrelevant",
      id: "some-unrelated-preference-item-id",
      showInPreferencesTab: "some-tab",

      components: {
        Hint: () => <div />,
        Input: () => <div />,
      },
    },
  ],
};

const someOtherExtensionStubWithExtensionSpecificPreferenceItems: Partial<LensRendererExtension> = {
  id: "some-other-test-extension-id",

  appPreferences: [
    {
      title: "Test preference item",
      id: "some-other-preference-item-id",

      components: {
        Hint: () => <div data-testid="some-other-preference-item-hint" />,
        Input: () => <div data-testid="some-other-preference-item-input" />,
      },
    },
  ],
};

const extensionStubWithoutPreferences: Partial<LensRendererExtension> = {
  id: "without-preferences-id",
};

const extensionStubWithShowInPreferencesTab: Partial<LensRendererExtension> = {
  id: "specified-preferences-page-id",

  appPreferences: [
    {
      title: "Test preference item",
      id: "very-other-preference-item-id",
      showInPreferencesTab: "some-tab",

      components: {
        Hint: () => <div data-testid="very-other-preference-item-hint" />,
        Input: () => <div data-testid="very-other-preference-item-input" />,
      },
    },
  ],
};

const extensionStubWithWithRegisteredTab: Partial<LensRendererExtension> = {
  id: "registered-tab-page-id",

  appPreferences: [
    {
      title: "License item",
      id: "metrics-preference-item-id",
      showInPreferencesTab: "metrics-extension-tab",

      components: {
        Hint: () => <div data-testid="metrics-preference-item-hint" />,
        Input: () => <div data-testid="metrics-preference-item-input" />,
      },
    },
    {
      title: "Menu item",
      id: "menu-preference-item-id",
      showInPreferencesTab: "menu-extension-tab",

      components: {
        Hint: () => <div data-testid="menu-preference-item-hint" />,
        Input: () => <div data-testid="menu-preference-item-input" />,
      },
    },
    {
      title: "Survey item",
      id: "survey-preference-item-id",
      showInPreferencesTab: "survey-extension-tab",

      components: {
        Hint: () => <div data-testid="survey-preference-item-hint" />,
        Input: () => <div data-testid="survey-preference-item-input" />,
      },
    },
  ],

  appPreferenceTabs: [{
    title: "Metrics tab",
    id: "metrics-extension-tab",
    orderNumber: 100,
  }],
};

const extensionStubWithWithRegisteredTabs: Partial<LensRendererExtension> = {
  id: "hello-world-tab-page-id",

  appPreferences: [
    {
      title: "Hello world",
      id: "hello-preference-item-id",
      showInPreferencesTab: "hello-extension-tab",

      components: {
        Hint: () => <div data-testid="hello-preference-item-hint" />,
        Input: () => <div data-testid="hello-preference-item-input" />,
      },
    },
    {
      title: "Logs",
      id: "logs-preference-item-id",
      showInPreferencesTab: "logs-extension-tab",

      components: {
        Hint: () => <div data-testid="logs-preference-item-hint" />,
        Input: () => <div data-testid="logs-preference-item-input" />,
      },
    },
  ],

  appPreferenceTabs: [{
    title: "Metrics tab",
    id: "hello-extension-tab",
    orderNumber: 100,
  }, {
    title: "Logs tab",
    id: "logs-extension-tab",
    orderNumber: 200,
  }],
};

const extensionStubWithWithSameRegisteredTab: Partial<LensRendererExtension> = {
  id: "duplicated-tab-page-id",

  appPreferences: [
    {
      title: "Another metrics",
      id: "another-metrics-preference-item-id",
      showInPreferencesTab: "metrics-extension-tab",

      components: {
        Hint: () => <div data-testid="another-metrics-preference-item-hint" />,
        Input: () => <div data-testid="another-metrics-preference-item-input" />,
      },
    },
  ],

  appPreferenceTabs: [{
    title: "Metrics tab",
    id: "metrics-extension-tab",
    orderNumber: 100,
  }],
};
