/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import type { ISidebarItem } from "../layout/sidebar";
import isActiveRouteInjectable from "../../routes/is-active-route.injectable";
import hasAccessToRouteInjectable from "../../routes/has-access-to-route.injectable";
import horizontalPodAutoscalersRouteInjectable from "./horizontal-pod-autoscalers-route.injectable";
import { configChildSidebarItemsInjectionToken } from "../+config/config-sidebar-items.injectable";
import navigateToRouteInjectable from "../../routes/navigate-to-route.injectable";

const horizontalPodAutoScalersSidebarItemsInjectable = getInjectable({
  id: "horizontal-pod-auto-scalers-sidebar-items",

  instantiate: (di) => {
    const route = di.inject(horizontalPodAutoscalersRouteInjectable);
    const navigateToRoute = di.inject(navigateToRouteInjectable);
    const isActiveRoute = di.inject(isActiveRouteInjectable);
    const hasAccessToRoute = di.inject(hasAccessToRouteInjectable);

    return computed((): ISidebarItem[] => [
      {
        title: "HPA",
        onClick: () => navigateToRoute(route),
        isActive: isActiveRoute(route),
        isVisible: hasAccessToRoute(route),
      },
    ]);
  },

  injectionToken: configChildSidebarItemsInjectionToken,
});

export default horizontalPodAutoScalersSidebarItemsInjectable;