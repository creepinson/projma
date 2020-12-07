import Joi from "joi";

export interface Config {
    packageManager: string;
    style: {
        indent: number;
    };
}

export const configSchema = Joi.object({
    packageManager: Joi.string()
        .required()
        .valid("npm", "pnpm", "yarn")
        .default("npm"),
    style: Joi.object({
        indent: Joi.number().required().default(4),
    }),
});
