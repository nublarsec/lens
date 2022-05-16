/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { computed } from "mobx";
import { notificationInjectionToken } from "../notification-injection-token";
import React from "react";
import updateIsBeingDownloadedInjectable from "../../../common/application-update/update-is-being-downloaded/update-is-being-downloaded.injectable";

const downloadingUpdateNotificationInjectable = getInjectable({
  id: "downloading-update-notification",

  instantiate: (di) => {
    const downloadingUpdateState = di.inject(updateIsBeingDownloadedInjectable);

    return {
      Component: DownloadingUpdateNotification,
      shown: computed(() => downloadingUpdateState.value.get()),
    };
  },

  injectionToken: notificationInjectionToken,
});

export default downloadingUpdateNotificationInjectable;

const DownloadingUpdateNotification = () => <div>Downloading update...</div>;
