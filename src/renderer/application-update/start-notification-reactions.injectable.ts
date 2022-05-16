/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import notificationsReactionsInjectable from "./notifications-reactions.injectable";
import { beforeFrameStartsInjectionToken } from "../before-frame-starts/before-frame-starts-injection-token";

const startNotificationReactionsInjectable = getInjectable({
  id: "start-notification-reactions",

  instantiate: (di) => {
    const notificationReactions = di.inject(notificationsReactionsInjectable);

    return {
      run: () => {
        notificationReactions.start();
      },
    };
  },

  injectionToken: beforeFrameStartsInjectionToken,
});

export default startNotificationReactionsInjectable;
