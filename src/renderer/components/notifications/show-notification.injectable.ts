/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { NotificationMessage } from "./notifications.store";
import { notificationsStore, NotificationStatus } from "./notifications.store";

const showNotificationInjectable = getInjectable({
  id: "show-notification",

  instantiate: () => (message: NotificationMessage) =>
    notificationsStore.add({
      status: NotificationStatus.INFO,
      timeout: 0,
      message,
    }),

  causesSideEffects: true,
});

export default showNotificationInjectable;
