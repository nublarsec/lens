/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import styles from "./helm-charts.module.scss";

import React from "react";
import { action, computed, observable, makeObservable } from "mobx";

import type { HelmRepo, HelmRepoManager } from "../../../main/helm/helm-repo-manager";
import { Button } from "../button";
import { Icon } from "../icon";
import { Notifications } from "../notifications";
import { Select, SelectOption } from "../select";
import { AddHelmRepoDialog } from "./add-helm-repo-dialog";
import { observer } from "mobx-react";
import { RemovableItem } from "./removable-item";
import { Notice } from "../+extensions/notice";
import { Spinner } from "../spinner";
import { withInjectables } from "@ogre-tools/injectable-react";
import helmRepoManagerInjectable from "../../../main/helm/helm-repo-manager.injectable";
import addHelmRepoDialogModelInjectable from "./add-helm-repo-dialog-model.injectable";

interface Dependencies {
  helmRepoManager: HelmRepoManager
  openAddHelmRepoDialog: () => void
}

@observer
class NonInjectedHelmCharts extends React.Component<Dependencies> {
  @observable loading = false;
  @observable repos: HelmRepo[] = [];
  @observable addedRepos = observable.map<string, HelmRepo>();

  constructor(props: Dependencies) {
    super(props);
    makeObservable(this);
  }

  @computed get options(): SelectOption<HelmRepo>[] {
    return this.repos.map(repo => ({
      label: repo.name,
      value: repo,
    }));
  }

  async componentDidMount() {
    await this.loadRepos();
  }

  @action
  async loadRepos() {
    this.loading = true;

    try {
      if (!this.repos.length) {
        this.repos = await this.props.helmRepoManager.loadAvailableRepos();
      }
      const repos = await this.props.helmRepoManager.repositories(); // via helm-cli

      this.addedRepos.clear();
      repos.forEach(repo => this.addedRepos.set(repo.name, repo));
    } catch (err) {
      Notifications.error(String(err));
    }

    this.loading = false;
  }

  async addRepo(repo: HelmRepo) {
    try {
      await this.props.helmRepoManager.addRepo(repo);
      this.addedRepos.set(repo.name, repo);
    } catch (err) {
      Notifications.error(<>Adding helm branch <b>{repo.name}</b> has failed: {String(err)}</>);
    }
  }

  async removeRepo(repo: HelmRepo) {
    try {
      await this.props.helmRepoManager.removeRepo(repo);
      this.addedRepos.delete(repo.name);
    } catch (err) {
      Notifications.error(
        <>Removing helm branch <b>{repo.name}</b> has failed: {String(err)}</>,
      );
    }
  }

  onRepoSelect = async ({ value: repo }: SelectOption<HelmRepo>) => {
    const isAdded = this.addedRepos.has(repo.name);

    if (isAdded) {
      Notifications.ok(<>Helm branch <b>{repo.name}</b> already in use</>);

      return;
    }
    this.loading = true;
    await this.addRepo(repo);
    this.loading = false;
  };

  formatOptionLabel = ({ value: repo }: SelectOption<HelmRepo>) => {
    const isAdded = this.addedRepos.has(repo.name);

    return (
      <div className="flex gaps">
        <span>{repo.name}</span>
        {isAdded && <Icon small material="check" className="box right"/>}
      </div>
    );
  };

  renderRepositories() {
    const repos = Array.from(this.addedRepos);

    if (this.loading) {
      return <div className="pt-5 relative"><Spinner center/></div>;
    }

    if (!repos.length) {
      return (
        <Notice>
          <div className="flex-grow text-center">The repositories have not been added yet</div>
        </Notice>
      );
    }

    return repos.map(([name, repo]) => {
      return (
        <RemovableItem key={name} onRemove={() => this.removeRepo(repo)} className="mt-3">
          <div>
            <div data-testid="repository-name" className={styles.repoName}>{name}</div>
            <div className={styles.repoUrl}>{repo.url}</div>
          </div>
        </RemovableItem>
      );
    });
  }

  render() {
    return (
      <div>
        <div className="flex gaps">
          <Select id="HelmRepoSelect"
            placeholder="Repositories"
            isLoading={this.loading}
            isDisabled={this.loading}
            options={this.options}
            onChange={this.onRepoSelect}
            formatOptionLabel={this.formatOptionLabel}
            controlShouldRenderValue={false}
            className="box grow"
            themeName="lens"
          />
          <Button
            primary
            label="Add Custom Helm Repo"
            onClick={this.props.openAddHelmRepoDialog}
          />
        </div>
        <AddHelmRepoDialog onAddRepo={() => this.loadRepos()}/>
        <div className={styles.repos}>
          {this.renderRepositories()}
        </div>
      </div>
    );
  }
}

export const HelmCharts = withInjectables<Dependencies>(
  NonInjectedHelmCharts,

  {
    getProps: (di) => ({
      helmRepoManager: di.inject(helmRepoManagerInjectable),
      openAddHelmRepoDialog: di.inject(addHelmRepoDialogModelInjectable).open,
    }),
  },
);
