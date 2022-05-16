/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import { normalizedPlatform } from "../vars";

const normalizedPlatformInjectable = getInjectable({
  id: "normalized-platform",
  instantiate: () => normalizedPlatform,
  causesSideEffects: true,
});

export default normalizedPlatformInjectable;
