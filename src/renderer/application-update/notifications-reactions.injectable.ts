/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { reaction } from "mobx";
import { getStartableStoppable } from "../../common/utils/get-startable-stoppable";
import showNotificationInjectable from "../components/notifications/show-notification.injectable";
import { notificationInjectionToken } from "./notification-injection-token";

const notificationsReactionsInjectable = getInjectable({
  id: "notifications-reactions",

  instantiate: (di) => {
    const notifications = di.injectMany(notificationInjectionToken);
    const showNotification = di.inject(showNotificationInjectable);

    return getStartableStoppable(
      "notifications",

      () => {
        const disposers = notifications.map((notification) => {

          let disposer: () => void;

          return reaction(
            () => notification.shown.get(),

            (shouldShowNotification) => {
              if (shouldShowNotification) {
                showNotification(notification.Component);
              } else {
                disposer?.();
              }
            },
          );
        });

        return () => {
          disposers.forEach((disposer) => disposer());
        };
      },
    );
  },
});

export default notificationsReactionsInjectable;
