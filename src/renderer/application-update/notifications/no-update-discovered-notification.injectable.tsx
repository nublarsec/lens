/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { notificationInjectionToken } from "../notification-injection-token";
import React from "react";
import discoveredUpdateVersionInjectable from "../../../common/application-update/discovered-update-version/discovered-update-version.injectable";

const noUpdateDiscoveredNotificationInjectable = getInjectable({
  id: "no-update-discovered-notification",

  instantiate: (di) => {
    const discoveredVersionState = di.inject(discoveredUpdateVersionInjectable);

    return {
      Component: NoUpdateDiscoveredNotification,

      shown: computed(() => {
        const discoveredUpdate = discoveredVersionState.value.get();

        return !discoveredUpdate?.version;
      }),
    };
  },

  injectionToken: notificationInjectionToken,
});

export default noUpdateDiscoveredNotificationInjectable;

const NoUpdateDiscoveredNotification = () => <div>asd</div>;
