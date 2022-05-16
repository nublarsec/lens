/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import createSyncBoxInjectable from "../../sync-box/create-sync-box.injectable";
import type { UpdateChannel } from "../../../main/update-app/update-channels";

const discoveredUpdateVersionInjectable = getInjectable({
  id: "discovered-update-version",

  instantiate: (di) => {
    const createSyncBox = di.inject(createSyncBoxInjectable);

    return createSyncBox<{ version: string; updateChannel: UpdateChannel }>(
      "discovered-update-version",
    );
  },
});

export default discoveredUpdateVersionInjectable;
