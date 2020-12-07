import fs from "fs-extra";
import simpleGit from "simple-git";
import yaml from "yaml";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { Listr, ListrRenderer, ListrTaskWrapper } from "listr2";
import { Config, configSchema } from "./config";
const git = simpleGit();

const execAsync = promisify(exec);

export interface TaskCtx {
    config: Config;
}

// generate mandatory files
const createProject = async () => {
    try {
        const targetDir = process.cwd();

        const templateURL = "https://github.com/creepinson/typescript-template";
        await git.clone(templateURL, targetDir);
    } catch (err) {
        throw new Error(`Failed to copy template files: ${err.message}`);
    }
};

// select package manager
const promptConfig = async (
    ctx: TaskCtx,
    task: ListrTaskWrapper<TaskCtx, typeof ListrRenderer>
) => {
    ctx.config = {
        packageManager: await task.prompt([
            {
                type: "autocomplete",
                name: "packageManager",
                message: "What package manager would you like to use?",
                default: "npm",
                choices: ["pnpm", "npm", "yarn"],
            },
        ]),
        style: {
            indent: await task.prompt([
                {
                    type: "input",
                    name: "indent",
                    message:
                        "What is your preferred indentation size? (Default: 4)",
                    default: "4",
                },
            ]),
        },
    };
    await fs.writeFile(configFile, yaml.stringify(ctx.config), {
        encoding: "utf-8",
    });
};

// save selection locally
const configFile = `${os.homedir()}/.config/projma`;

// check for package manager selection
export const getConfig = async (
    ctx: TaskCtx,
    task: ListrTaskWrapper<TaskCtx, typeof ListrRenderer>
): Promise<void> => {
    if (!(await fs.pathExists(configFile))) await promptConfig(ctx, task);

    ctx.config = yaml.parse(
        await fs.readFile(configFile, { encoding: "utf-8" })
    );

    const validResult = configSchema.validate(ctx.config);

    if (validResult.error) await promptConfig(ctx, task);

    /*
    if (
        !ctx.config.packageManager ||
        (ctx.config.packageManager &&
            !["npm", "pnpm", "yarn"].includes(ctx.config.packageManager.trim()))
    )
        await promptConfig(ctx, task); */
};

//automatically install the dependencies
export const installDependencies = async (ctx: TaskCtx) => {
    if (!["npm", "pnpm", "yarn"].includes(ctx.config.packageManager.trim()))
        throw new Error(
            `Install error: Invalid package manager in ${configFile}`
        );

    const { stderr } = await execAsync(
        `${ctx.config.packageManager.trim()} install`,
        {
            cwd: process.cwd(),
        }
    );
    if (stderr) throw new Error(`Install error: ${stderr}`);
};

//generates task list in console
export const tasks = new Listr<TaskCtx>(
    [
        {
            title: "Retrieve Config",
            task: getConfig,
        },
        {
            title: "Create Project Files",
            task: createProject,
        },
        {
            title: "Install Dependencies",
            task: installDependencies,
        },
    ],
    { concurrent: 1 }
);
