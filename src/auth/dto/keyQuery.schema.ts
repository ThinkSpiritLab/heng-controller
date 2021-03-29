import * as Joi from "@hapi/joi";
import { KEY_LENGTH_NOT_ROOT } from "../auth.decl";
export const KeyPairQuerySchema = Joi.object().keys({
    ak: Joi.string().length(KEY_LENGTH_NOT_ROOT),
    sk: Joi.string().optional().length(KEY_LENGTH_NOT_ROOT),
    roles: Joi.array()
});
