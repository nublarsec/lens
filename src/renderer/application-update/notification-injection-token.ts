/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectionToken } from "@ogre-tools/injectable";
import type { IComputedValue } from "mobx";

interface Notification {
  Component: React.ReactNode;
  shown: IComputedValue<boolean>;
}

export const notificationInjectionToken = getInjectionToken<Notification>({
  id: "notification",
});
