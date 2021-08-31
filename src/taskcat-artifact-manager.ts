import { injectable, inject } from "inversify";
import { ArtifactClient, TaskcatArtifactManager } from "./interfaces";
import { TYPES } from "./types";
import { ReplaceInFileConfig, ReplaceResult } from "replace-in-file";
import { glob } from "glob";
import * as core from "@actions/core";

/**
 * Manages the artifacts generated by the taskcat GitHub Action.
 */
@injectable()
class TaskcatArtifactManagerImpl implements TaskcatArtifactManager {
  private _artifactClient: ArtifactClient;
  private _sync: (config: ReplaceInFileConfig) => ReplaceResult[];

  public constructor(
    @inject(TYPES.ArtifactClient) artifactClient: ArtifactClient,
    @inject(TYPES.ReplaceInFile)
    sync: (config: ReplaceInFileConfig) => ReplaceResult[]
  ) {
    this._artifactClient = artifactClient;
    this._sync = sync;
  }

  /**
   * Mask the AWS account ID from the log files generated in the taskcat_outputs
   * directory, and publish them as a GitHub artifact.
   */
  public maskAndPublishTaskcatArtifacts(awsAccountId: string): void {
    core.info("Entered the maskAndPublishTaskcatArtifacts function");
    this.maskAccountId(awsAccountId, "taskcat_outputs/*");
    this.publishTaskcatOutputs(
      process.env.GITHUB_WORKSPACE + "/taskcat_outputs/"
    );
  }

  /**
   * Masks the AWS account ID from the taskcat_output logs.
   *
   * @throws {@link Error} Thrown if the AWS account ID is an empty string.
   *
   * @param awsAccountId - the AWS account ID to mask in the logs.
   * @param filePath - the file path to the `taskcat_outputs` directory.
   */
  public maskAccountId(awsAccountId: string, filePath: string): void {
    if (awsAccountId === "") {
      throw new Error();
    }

    const replaceOptions: ReplaceInFileConfig = {
      files: filePath,
      from: awsAccountId,
      to: "***",
    };

    this._sync(replaceOptions);
  }

  /**
   * Publish the taskcat output logs as a GitHub artifact
   *
   * @param filePath - the file path to the `taskcat_outputs` directory
   */
  public publishTaskcatOutputs(filePath: string): void {
    const taskcatLogs: string[] = glob.sync(filePath + "*");

    this._artifactClient.uploadArtifact(
      "taskcat_outputs",
      taskcatLogs,
      filePath
    );
  }
}

export { TaskcatArtifactManagerImpl };