import * as errors from './error';
import { initInfo, initUserPromise } from './init';
import encodeGetParams from './string';

const API_URL = 'https://api.feathery.tech/';
const CDN_URL = 'https://cdn.feathery.tech/';

export default class Client {
    constructor(formKey) {
        this.formKey = formKey;
    }

    async fetchForm() {
        const { apiKey, forms } = initInfo();
        if (this.formKey in forms) return Promise.resolve(forms[this.formKey]);

        const params = encodeGetParams({
            form_key: this.formKey
        });
        const url = `${CDN_URL}api/panel/v3/?${params}`;
        const options = {
            cache: 'no-store',
            importance: 'high',
            headers: { Authorization: 'Token ' + apiKey }
        };
        return fetch(url, options).then((response) => {
            const { status } = response;
            switch (status) {
                case 200:
                    return response.json();
                case 401:
                    return Promise.reject(
                        new errors.APIKeyError('Invalid API key')
                    );
                case 404:
                    return Promise.reject(
                        new errors.FormKeyError('Invalid form key')
                    );
                default:
                    return Promise.reject(
                        new errors.FetchError('Unknown error')
                    );
            }
        });
    }

    async fetchSession() {
        await initUserPromise;
        const { apiKey, userKey, sessions } = initInfo();
        if (this.formKey in sessions)
            return Promise.resolve(sessions[this.formKey]);

        const params = encodeGetParams({
            form_key: this.formKey,
            ...(userKey ? { fuser_key: userKey } : {})
        });
        const url = `${API_URL}api/panel/session/?${params}`;
        const options = {
            cache: 'no-store',
            importance: 'high',
            headers: { Authorization: 'Token ' + apiKey }
        };
        return fetch(url, options).then((response) => {
            const { status } = response;
            switch (status) {
                case 200:
                    return response.json();
                case 401:
                    return Promise.reject(
                        new errors.APIKeyError('Invalid API key')
                    );
                case 404:
                    return Promise.reject(
                        new errors.FormKeyError('Invalid form key')
                    );
                default:
                    return Promise.reject(
                        new errors.FetchError('Unknown error')
                    );
            }
        });
    }

    async fetchFile(fileURL) {
        return fetch(fileURL).then((response) => {
            const { status } = response;
            switch (status) {
                case 200:
                    return response.blob();
                default:
                    return Promise.reject(
                        new errors.FetchError('Invalid file URL')
                    );
            }
        });
    }

    submitCustom(customKeyValues) {
        const { userKey, apiKey } = initInfo();
        const url = `${API_URL}api/panel/custom/submit/`;
        const data = {
            ...(userKey ? { fuser_key: userKey } : {}),
            custom_key_values: customKeyValues,
            form_key: this.formKey
        };
        const options = {
            cache: 'no-store',
            headers: {
                Authorization: 'Token ' + apiKey,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(data)
        };
        fetch(url, options).then((response) => {
            const { status } = response;
            switch (status) {
                case 200:
                    return;
                case 201:
                    return;
                case 401:
                    throw new errors.APIKeyError('Invalid API key');
                case 404:
                    throw new errors.UserKeyError('Invalid user key');
                default:
                    throw new errors.FetchError('Unknown error');
            }
        });
    }

    _submitJSONData(servars) {
        const { userKey, apiKey } = initInfo();
        const url = `${API_URL}api/panel/step/submit/`;
        const data = {
            ...(userKey ? { fuser_key: userKey } : {}),
            servars
        };
        const options = {
            cache: 'no-store',
            headers: {
                Authorization: 'Token ' + apiKey,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(data)
        };
        fetch(url, options).then((response) => {
            const { status } = response;
            switch (status) {
                case 200:
                    return;
                case 201:
                    return;
                case 401:
                    throw new errors.APIKeyError('Invalid API key');
                case 404:
                    throw new errors.UserKeyError('Invalid user key');
                default:
                    throw new errors.FetchError('Unknown error');
            }
        });
    }

    _submitFileData(servars) {
        const { userKey, apiKey } = initInfo();
        const url = `${API_URL}api/panel/step/submit/file/${userKey}/`;

        const formData = new FormData();
        servars.forEach((servar) => {
            formData.append(servar.key, servar.file_upload);
        });

        const options = {
            cache: 'no-store',
            headers: {
                Authorization: 'Token ' + apiKey
            },
            method: 'POST',
            body: formData
        };
        fetch(url, options).then((response) => {
            const { status } = response;
            switch (status) {
                case 200:
                    return;
                case 201:
                    return;
                case 401:
                    throw new errors.APIKeyError('Invalid API key');
                case 404:
                    throw new errors.UserKeyError('Invalid user key');
                default:
                    throw new errors.FetchError('Unknown error');
            }
        });
    }

    // servars = [{key: <servarKey>, <type>: <value>}]
    submitStep(servars) {
        const jsonServars = servars.filter(
            (servar) => !('file_upload' in servar)
        );
        this._submitJSONData(jsonServars);
        const fileServars = servars.filter((servar) => 'file_upload' in servar);
        if (fileServars.length > 0) this._submitFileData(fileServars);
    }

    registerEvent({ stepKey, nextStepKey = '', event }) {
        initUserPromise.then(() => {
            const { userKey, apiKey } = initInfo();
            const url = `${API_URL}api/event/`;
            const data = {
                form_key: this.formKey,
                step_key: stepKey,
                next_step_key: nextStepKey,
                event,
                ...(userKey ? { fuser_key: userKey } : {})
            };
            const options = {
                cache: 'no-store',
                headers: {
                    Authorization: 'Token ' + apiKey,
                    'Content-Type': 'application/json'
                },
                method: 'POST',
                body: JSON.stringify(data)
            };
            fetch(url, options).then((response) => {
                const { status } = response;
                switch (status) {
                    case 200:
                        return;
                    case 201:
                        return;
                    case 401:
                        throw new errors.APIKeyError('Invalid API key');
                    case 404:
                        throw new errors.UserKeyError('Invalid user key');
                    default:
                        throw new errors.FetchError('Unknown error');
                }
            });
        });
    }
}
