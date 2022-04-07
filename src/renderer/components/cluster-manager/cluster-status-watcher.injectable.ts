/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */
import { getInjectable } from "@ogre-tools/injectable";
import type { ClusterId, KubeAuthUpdate } from "../../../common/cluster-types";
import ipcRendererInjectable from "../../app-paths/get-value-from-registered-channel/ipc-renderer/ipc-renderer.injectable";
import clusterConnectionStatusStateInjectable from "./cluster-status.state.injectable";

const clusterStatusWatcherInjectable = getInjectable({
  id: "cluster-status-watcher",
  instantiate: () => undefined,
  setup: async (di) => {
    const state = await di.inject(clusterConnectionStatusStateInjectable);
    const ipcRenderer = await di.inject(ipcRendererInjectable);

    ipcRenderer.on("cluster:connection-update", (evt, clusterId: ClusterId, update: KubeAuthUpdate) => {
      state.forCluster(clusterId).appendAuthUpdate(update);
    });
  },
});

export default clusterStatusWatcherInjectable;
