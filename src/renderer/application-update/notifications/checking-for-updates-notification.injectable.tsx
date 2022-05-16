/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { notificationInjectionToken } from "../notification-injection-token";
import updatesAreBeingDiscoveredInjectable from "../../../common/application-update/updates-are-being-discovered/updates-are-being-discovered.injectable";
import React from "react";

const checkingForUpdatesNotificationInjectable = getInjectable({
  id: "checking-for-updates-notification",

  instantiate: (di) => {
    const checkingForUpdatesState = di.inject(updatesAreBeingDiscoveredInjectable);

    return {
      Component: CheckingForUpdatesNotification,
      shown: computed(() => checkingForUpdatesState.value.get()),
    };
  },

  injectionToken: notificationInjectionToken,
});

export default checkingForUpdatesNotificationInjectable;

const CheckingForUpdatesNotification = () => <div>Checking for updates...</div>;
