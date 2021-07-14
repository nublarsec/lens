/**
 * Copyright (c) 2021 OpenLens Authors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import React from "react";
import { CreateNewFolderOutlined, NoteAdd } from "@material-ui/icons";
import { kubernetesClusterCategory } from "../../common/catalog-entities";
import { addClusterURL, preferencesURL } from "../../common/routes";
import { PathPicker } from "../components/path-picker";
import { multiSet } from "../utils";
import { UserStore } from "../../common/user-store";
import { getAllEntries } from "../components/+preferences/kubeconfig-syncs";
import { runInAction } from "mobx";
import { isWindows } from "../../common/vars";

async function addSyncEntries(filePaths: string[]) {
  const entries = await getAllEntries(filePaths);

  runInAction(() => {
    multiSet(UserStore.getInstance().syncKubeconfigEntries, entries);
  });
}

export function initCatalogCategoryRegistryEntries() {
  kubernetesClusterCategory.on("catalogAddMenu", ctx => {
    ctx.menuItems.push(
      {
        icon: "text_snippet",
        title: "Add from kubeconfig",
        onClick: () => ctx.navigate(addClusterURL()),
      },
    );

    if (isWindows) {
      ctx.menuItems.push(
        {
          icon: () => <CreateNewFolderOutlined fontSize="large" />,
          title: "Sync kubeconfig folders(s)",
          onClick: async () => {
            await PathPicker.pick({
              label: "Sync folders(s)",
              buttonLabel: "Sync",
              properties: ["showHiddenFiles", "multiSelections", "openDirectory"],
              onPick: addSyncEntries,
            });
            ctx.navigate(preferencesURL({ fragment: "kube-sync" }));
          },
        },
        {
          icon: () => <NoteAdd fontSize="large" />,
          title: "Sync kubeconfig file(s)",
          onClick: async () => {
            await PathPicker.pick({
              label: "Sync file(s)",
              buttonLabel: "Sync",
              properties: ["showHiddenFiles", "multiSelections", "openFile"],
              onPick: addSyncEntries,
            });
            ctx.navigate(preferencesURL({ fragment: "kube-sync" }));
          },
        },
      );
    } else {
      ctx.menuItems.push(
        {
          icon: "settings",
          title: "Sync kubeconfig(s)",
          onClick: async () => {
            await PathPicker.pick({
              label: "Sync file(s)",
              buttonLabel: "Sync",
              properties: ["showHiddenFiles", "multiSelections", "openFile"],
              onPick: addSyncEntries,
            });
            ctx.navigate(preferencesURL({ fragment: "kube-sync" }));
          },
        },
      );
    }
  });
}