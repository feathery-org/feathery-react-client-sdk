import React, { useEffect, useState } from 'react';

import Button from 'react-bootstrap/Button';
import ReactForm from 'react-bootstrap/Form';
import { Progress } from '@zendeskgarden/react-loaders';
import { SketchPicker } from 'react-color';

import Client from './utils/client';
import { initInfo } from './utils/init';
import { fieldState } from './Fields';

import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const uuidV4Regex = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
const angleBracketRegex = /<[^>]*>/g;

// sdkKey and userKey are required if displayStep === null
// totalSteps is required if displayStep !== null
export default function Form({
    // Public API
    formKey,
    clientKey = '',

    // Internal
    companyKey = null,
    displayStep = null,
    showGrid = false,
    totalSteps = null,
    setExternalState = () => {}
}) {
    const { sdkKey, userKey } = initInfo();

    const [client, setClient] = useState(null);

    const [finishConfig, setFinishConfig] = useState({
        finished: false,
        redirectURL: null
    });
    const [displayColorPicker, setDisplayColorPicker] = useState({});
    const [acceptedFile, setAcceptedFile] = useState(null);
    const [step, setStep] = useState(displayStep);

    useEffect(() => {
        if (displayStep === null) {
            const clientInstance = new Client(companyKey || userKey);
            setClient(clientInstance);
            clientInstance
                .begin(formKey)
                .then((step) => {
                    if (step.step_number === null) {
                        setFinishConfig({
                            finished: true,
                            redirectURL: step.redirect_url
                        });
                    } else setStep(step);
                })
                .catch((error) => console.log(error));
        } else setStep(displayStep);
    }, [displayStep, sdkKey, userKey]);

    if (displayStep === null && finishConfig.finished) {
        if (finishConfig.redirectURL) {
            window.location.href = finishConfig.redirectURL;
        }
        return null;
    }

    const handleChange = (e) => {
        const target = e.target;
        const value =
            target.type === 'checkbox' ? target.checked : target.value;
        const id = target.id;
        const newServarFields = step.servar_fields.map((field) => {
            const servar = field.servar;
            if (servar.id !== id) return field;
            if (servar.type === 'integer_field')
                field.servar.value = parseInt(value);
            else field.servar.value = value;
            return field;
        });
        setStep({ ...step, servar_fields: newServarFields });
    };

    const handleMultiselectChange = (servarID) => (e) => {
        const target = e.target;
        const opt = target.name;
        const newServarFields = step.servar_fields.map((field) => {
            const servar = field.servar;
            if (servar.id !== servarID) return field;
            if (target.checked) servar.value.push(opt);
            else servar.value = servar.value.filter((val) => val !== opt);
            return field;
        });
        setStep({ ...step, servar_fields: newServarFields });
    };

    const handleColorChange = (servarID) => (color) => {
        const newServarFields = step.servar_fields.map((field) => {
            const servar = field.servar;
            if (servar.id !== servarID) return field;
            servar.value = color.hex.substr(1, 6);
            return field;
        });
        setStep({ ...step, servar_fields: newServarFields });
    };

    const handleColorPickerClick = (servarID) => () => {
        const curVal = displayColorPicker[servarID];
        setDisplayColorPicker({
            ...displayColorPicker,
            [servarID]: !curVal
        });
    };

    const replaceRequestParams = (params, servarLookupMap) => {
        if (Array.isArray(params))
            return params.map((p) => replaceRequestParams(p, servarLookupMap));
        else if (typeof params === 'object' && params !== null) {
            const newParams = {};
            for (const key in params) {
                newParams[key] = replaceRequestParams(
                    params[key],
                    servarLookupMap
                );
            }
            return newParams;
        } else if (typeof params === 'string' && params.match(uuidV4Regex))
            return servarLookupMap[params];
        else return params;
    };

    const setResponseParams = (params, response, servarLookupMap) => {
        if (Array.isArray(params)) {
            let promises = [];
            params.forEach((p, index) => {
                promises = promises.concat(
                    setResponseParams(p, response[index], servarLookupMap)
                );
            });
            return promises;
        } else if (typeof params === 'object' && params !== null) {
            let promises = [];
            for (const key in params) {
                promises = promises.concat(
                    setResponseParams(
                        params[key],
                        response[key],
                        servarLookupMap
                    )
                );
            }
            return promises;
        } else if (typeof params === 'string' && params.match(uuidV4Regex)) {
            servarLookupMap[params] = response;
            return [
                fetch(`https://api.feathery.tech/api/servar/fuser/`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Token ${sdkKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fuser_key: userKey,
                        servar_id: params,
                        value: response
                    })
                }).catch((e) => console.log(e))
            ];
        }
    };

    const replaceURLParams = (url, servarLookupMap) => {
        return url.replace(angleBracketRegex, (match) => {
            const val = match.substring(1, match.length - 1);
            if (val in servarLookupMap) return servarLookupMap[val];
            return match;
        });
    };

    /**
     * Timeout function
     * @param {Integer} time (milliseconds)
     * @param {Promise} promise
     */
    const timeout = (time, promise) => {
        return new Promise(function (resolve, reject) {
            setTimeout(() => {
                reject(new Error('Request timed out.'));
            }, time);
            promise.then(resolve, reject);
        });
    };

    const submit = (skip = false) => {
        let fileUploadServarID = '';
        step.servar_fields.forEach((field) => {
            const servar = field.servar;
            if (servar.type === 'file_upload') {
                if (acceptedFile === null) return;
                fileUploadServarID = servar.id;
            }
        });

        const noFileServars = step.servar_fields.filter(
            (field) => field.servar.type !== 'file_upload'
        );
        const submitServars = noFileServars.map((field) => {
            const servar = field.servar;
            return { key: servar.key, [servar.type]: servar.value };
        });
        client
            .submitStep(formKey, step.step_number, submitServars, skip)
            .then(async (newStep) => {
                // set real time field values for programmatic access
                noFileServars.forEach((field) => {
                    const servar = field.servar;
                    fieldState.realTimeFields[servar.key] = servar.value;
                });
                if (!skip) {
                    const servarLookupMap = step.servar_fields.reduce(
                        (map, field) => {
                            const servar = field.servar;
                            map[servar.id] = servar.value;
                            return map;
                        },
                        {}
                    );
                    for (const action of step.actions) {
                        const options = {
                            method: action.method.toUpperCase(),
                            headers: { Authorization: `Bearer ${clientKey}` }
                        };

                        if (action.body_type === 'application/json') {
                            options.headers['Content-Type'] = action.body_type;
                            options.body = JSON.stringify(
                                replaceRequestParams(
                                    action.params,
                                    servarLookupMap
                                )
                            );
                        } else if (action.body_type === 'multipart/form-data') {
                            if (
                                action.form_data_servar !== fileUploadServarID
                            ) {
                                console.log('Invalid file upload action');
                                return;
                            }
                            const body = new FormData();
                            body.append(action.form_data_key, acceptedFile);
                            options.body = body;
                        }

                        const url = replaceURLParams(
                            action.url,
                            servarLookupMap
                        );
                        const promise = fetch(url, options)
                            .then((r) => r.json())
                            .then(async (d) => {
                                const promises = setResponseParams(
                                    action.response_params,
                                    d,
                                    servarLookupMap
                                );
                                if (promises) await Promise.all(promises);
                            })
                            .catch((e) => console.log(e));
                        if (action.response_params)
                            await timeout(1000, promise);
                    }
                }

                if (newStep.step_number === null) {
                    setFinishConfig({
                        finished: true,
                        redirectURL: newStep.redirect_url
                    });
                } else setStep(newStep);
            })
            .catch((error) => {
                if (error) console.log(error);
            });
    };

    if (step === null) return null;

    let isFilled = true;
    for (const field of step.servar_fields) {
        const value = field.servar.value;
        switch (field.servar.type) {
            case 'text_field':
                if (value === '') isFilled = false;
                break;
            case 'select':
                if (value === '') isFilled = false;
                break;
            case 'dropdown':
                if (value === '') isFilled = false;
                break;
            case 'file_upload':
                if (acceptedFile === null) isFilled = false;
                break;
            default:
                break;
        }
    }

    const numColumns = step.grid_columns.length;
    const numRows = step.grid_rows.length;
    const maxSteps = displayStep ? totalSteps : step.total_steps;

    const gridTemplateRows = step.grid_rows.join(' ');
    let gridTemplateColumns;
    if (window.innerWidth >= 768) {
        gridTemplateColumns = step.grid_columns.join(' ');
    } else {
        const seenColumns = new Set();
        if (step.progress_bar) seenColumns.add(step.progress_bar.column_index);
        step.text_fields.map((field) => seenColumns.add(field.column_index));
        step.servar_fields.map((field) => seenColumns.add(field.column_index));
        gridTemplateColumns = step.grid_columns
            .map((c, index) => (seenColumns.has(index) ? c : '10px'))
            .join(' ');
    }

    let progressBarElements = null;
    if (step.progress_bar) {
        progressBarElements = [
            <Progress
                key='progress'
                css={{ width: `${step.progress_bar.bar_width}%` }}
                color={`#${step.progress_bar.bar_color}`}
                value={(step.step_number / maxSteps) * 100}
            />
        ];
        const completionPercentage = `${Math.round(
            (step.step_number / maxSteps) * 100
        )}% completed`;
        if (step.progress_bar.percent_text_layout === 'top') {
            progressBarElements.splice(0, 0, completionPercentage);
        } else if (step.progress_bar.percent_text_layout === 'bottom') {
            progressBarElements.splice(1, 0, completionPercentage);
        }
    }
    return (
        <div
            css={{
                height: '100%',
                backgroundColor: `#${step.default_background_color}`,
                backgroundSize: '100% 100%',
                display: 'grid',
                overflow: 'hidden',
                gridTemplateColumns,
                gridTemplateRows
            }}
        >
            {showGrid &&
                Array.from({ length: numColumns - 1 }, (_, i) => (
                    <div
                        css={{
                            gridColumn: i + 1,
                            gridRowStart: 1,
                            gridRowEnd: -1,
                            borderRight: '2px dashed #DEDFE2'
                        }}
                    />
                ))}
            {showGrid &&
                Array.from({ length: numRows - 1 }, (_, i) => (
                    <div
                        css={{
                            gridRowStart: i + 1,
                            gridColumnStart: 1,
                            gridColumnEnd: -1,
                            borderBottom: '2px dashed #DEDFE2'
                        }}
                    />
                ))}
            {step.progress_bar && (
                <div
                    css={{
                        gridColumn: step.progress_bar.column_index + 1,
                        gridRow: step.progress_bar.row_index + 1,
                        alignItems: step.progress_bar.layout,
                        color: `#${step.progress_bar.font_color}`,
                        fontStyle: step.progress_bar.font_italic
                            ? 'italic'
                            : 'normal',
                        fontWeight: step.progress_bar.font_weight,
                        fontFamily: step.progress_bar.font_family,
                        fontSize: `${step.progress_bar.font_size}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        ...(displayStep ? { cursor: 'pointer' } : {})
                    }}
                    onClick={() => setExternalState('progressBar', true)}
                >
                    {progressBarElements}
                </div>
            )}
            {step.text_fields.map((field, i) => (
                <div
                    key={i.toString() + ':' + step.step_number.toString()}
                    css={{
                        gridColumn: field.column_index + 1,
                        gridRow: field.row_index + 1,
                        alignItems: field.layout,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        ...(displayStep ? { cursor: 'pointer' } : {})
                    }}
                    onClick={() => setExternalState('text', i)}
                >
                    {field.is_button ? (
                        <Button
                            className={
                                (displayStep !== null ||
                                    field.link !== 'next' ||
                                    isFilled) &&
                                'step-button-active'
                            }
                            css={{
                                color: `#${field.font_color}`,
                                fontStyle: field.font_italic
                                    ? 'italic'
                                    : 'normal',
                                fontWeight: field.font_weight,
                                fontFamily: field.font_family,
                                fontSize: `${field.font_size}px`,
                                borderColor: `#${field.button_color}`,
                                backgroundColor: `#${field.button_color}`,
                                height: `${field.button_height}${field.button_height_unit}`,
                                width: `${field.button_width}${field.button_width_unit}`
                            }}
                            disabled={
                                field.link === 'next' &&
                                !isFilled &&
                                displayStep === null
                            }
                            onClick={() => {
                                if (displayStep !== null || field.link === null)
                                    return;
                                submit(field.link === 'skip');
                            }}
                            dangerouslySetInnerHTML={{
                                __html: field.text
                            }}
                        />
                    ) : (
                        <div
                            onClick={() => {
                                if (displayStep !== null || field.link === null)
                                    return;
                                submit(field.link === 'skip');
                            }}
                            css={{
                                color: `#${field.font_color}`,
                                fontStyle: field.font_italic
                                    ? 'italic'
                                    : 'normal',
                                fontWeight: field.font_weight,
                                fontFamily: field.font_family,
                                fontSize: `${field.font_size}px`,
                                ...(field.link === null
                                    ? {}
                                    : { cursor: 'pointer' })
                            }}
                            dangerouslySetInnerHTML={{
                                __html: field.text
                            }}
                        />
                    )}
                </div>
            ))}
            {step.servar_fields.map((field, i) => {
                const servar = field.servar;
                const metadata = field.metadata;
                let servarComponent;

                switch (servar.type) {
                    case 'file_upload':
                        servarComponent = (
                            <ReactForm.Group css={{ width: '100%' }}>
                                {servar.name}
                                <ReactForm.File
                                    id={servar.id}
                                    accept='image/*'
                                    onChange={(e) => {
                                        setAcceptedFile(e.target.files[0]);
                                    }}
                                    css={{ marginTop: '10px' }}
                                />
                            </ReactForm.Group>
                        );
                        break;
                    case 'checkbox':
                        servarComponent = (
                            <ReactForm.Group css={{ width: '100%' }}>
                                <ReactForm.Check
                                    type='checkbox'
                                    id={servar.id}
                                    label={servar.name}
                                    checked={servar.value}
                                    onChange={handleChange}
                                    css={{
                                        marginTop: '10px',
                                        borderColor: `#${field.border_top_color} #${field.border_right_color} #${field.border_bottom_color} #${field.border_left_color}`
                                    }}
                                />
                            </ReactForm.Group>
                        );
                        break;
                    case 'dropdown':
                        servarComponent = (
                            <ReactForm.Group css={{ width: '100%' }}>
                                {servar.name}
                                <ReactForm.Control
                                    css={{
                                        marginTop: '10px',
                                        display: 'block',
                                        height: '50px',
                                        width: `${field.field_width}${field.field_width_unit}`,
                                        borderColor: `#${field.border_top_color} #${field.border_right_color} #${field.border_bottom_color} #${field.border_left_color}`
                                    }}
                                    as='select'
                                    id={servar.id}
                                    value={servar.value}
                                    onChange={handleChange}
                                    custom
                                >
                                    <option key='' value='' disabled>
                                        Select...
                                    </option>
                                    {servar.metadata.options.map((option) => (
                                        <option key={option}>{option}</option>
                                    ))}
                                </ReactForm.Control>
                            </ReactForm.Group>
                        );
                        break;
                    case 'multiselect':
                        servarComponent = (
                            <ReactForm.Group css={{ width: '100%' }}>
                                {servar.name}
                                <div css={{ marginTop: '10px' }}>
                                    {servar.metadata.options.map((opt) => {
                                        return (
                                            <ReactForm.Check
                                                type='checkbox'
                                                name={opt}
                                                key={opt}
                                                label={opt}
                                                checked={servar.value.includes(
                                                    opt
                                                )}
                                                onChange={handleMultiselectChange(
                                                    servar.id
                                                )}
                                                css={{
                                                    borderColor: `#${field.border_top_color} #${field.border_right_color} #${field.border_bottom_color} #${field.border_left_color}`
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </ReactForm.Group>
                        );
                        break;
                    case 'select':
                        servarComponent = (
                            <ReactForm.Group css={{ width: '100%' }}>
                                {servar.name}
                                <div css={{ marginTop: '10px' }}>
                                    {servar.metadata.options.map((opt) => {
                                        return (
                                            <ReactForm.Check
                                                type='radio'
                                                id={servar.id}
                                                label={opt}
                                                checked={servar.value === opt}
                                                onChange={handleChange}
                                                value={opt}
                                                key={opt}
                                                css={{
                                                    borderColor: `#${field.border_top_color} #${field.border_right_color} #${field.border_bottom_color} #${field.border_left_color}`
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </ReactForm.Group>
                        );
                        break;
                    case 'integer_field':
                        servarComponent = (
                            <ReactForm.Group css={{ width: '100%' }}>
                                {servar.name}: <b>0</b>
                                <ReactForm.Control
                                    id={servar.id}
                                    type='range'
                                    step={1}
                                    value={servar.value}
                                    onChange={handleChange}
                                    css={{
                                        marginTop: '10px',
                                        width: `${field.field_width}${field.field_width_unit}`,
                                        borderColor: `#${field.border_top_color} #${field.border_right_color} #${field.border_bottom_color} #${field.border_left_color}`
                                    }}
                                />
                            </ReactForm.Group>
                        );
                        break;
                    case 'hex_color':
                        servarComponent = (
                            <ReactForm.Group css={{ width: '100%' }}>
                                {servar.name}
                                <div
                                    css={{
                                        marginTop: '10px',
                                        width: '36px',
                                        height: '36px',
                                        background: `#${servar.value}`,
                                        cursor: 'pointer',
                                        borderColor: `#${field.border_top_color} #${field.border_right_color} #${field.border_bottom_color} #${field.border_left_color}`
                                    }}
                                    onClick={handleColorPickerClick(servar.id)}
                                />
                                {displayColorPicker[servar.id] ? (
                                    <div
                                        css={{
                                            position: 'absolute',
                                            zIndex: 2
                                        }}
                                    >
                                        <div
                                            css={{
                                                position: 'fixed',
                                                top: '0px',
                                                right: '0px',
                                                bottom: '0px',
                                                left: '0px'
                                            }}
                                            onClick={handleColorPickerClick(
                                                servar.id
                                            )}
                                        />
                                        <SketchPicker
                                            color={`#${servar.value}`}
                                            onChange={handleColorChange(
                                                servar.id
                                            )}
                                        />
                                    </div>
                                ) : null}
                            </ReactForm.Group>
                        );
                        break;
                    case 'text_area':
                        servarComponent = (
                            <ReactForm.Group css={{ width: '100%' }}>
                                {servar.name}
                                <ReactForm.Control
                                    as='textarea'
                                    rows={metadata.num_rows}
                                    id={servar.id}
                                    value={servar.value}
                                    onChange={handleChange}
                                    placeholder={metadata.placeholder || ''}
                                    css={{
                                        marginTop: '10px',
                                        width: `${field.field_width}${field.field_width_unit}`,
                                        borderColor: `#${field.border_top_color} #${field.border_right_color} #${field.border_bottom_color} #${field.border_left_color}`,
                                        '::placeholder': {
                                            color: `#${field.metadata.placeholder_color}`,
                                            fontStyle: field.metadata
                                                .placeholder_italic
                                                ? 'italic'
                                                : 'normal'
                                        }
                                    }}
                                />
                            </ReactForm.Group>
                        );
                        break;
                    default:
                        servarComponent = (
                            <ReactForm.Group css={{ width: '100%' }}>
                                {servar.name}
                                <ReactForm.Control
                                    type='text'
                                    css={{
                                        marginTop: '10px',
                                        display: 'block',
                                        height: '50px',
                                        width: `${field.field_width}${field.field_width_unit}`,
                                        borderColor: `#${field.border_top_color} #${field.border_right_color} #${field.border_bottom_color} #${field.border_left_color}`,
                                        '::placeholder': {
                                            color: `#${field.metadata.placeholder_color}`,
                                            fontStyle: field.metadata
                                                .placeholder_italic
                                                ? 'italic'
                                                : 'normal'
                                        }
                                    }}
                                    id={servar.id}
                                    value={servar.value}
                                    onChange={handleChange}
                                    placeholder={metadata.placeholder || ''}
                                />
                            </ReactForm.Group>
                        );
                }
                return (
                    <div
                        css={{
                            gridColumn: field.column_index + 1,
                            gridRow: field.row_index + 1,
                            alignItems: field.layout,
                            color: `#${field.font_color}`,
                            fontStyle: field.font_italic ? 'italic' : 'normal',
                            fontWeight: field.font_weight,
                            fontFamily: field.font_family,
                            fontSize: `${field.font_size}px`,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                        onClick={() => setExternalState('servar', i)}
                        key={i}
                    >
                        {servarComponent}
                    </div>
                );
            })}
        </div>
    );
}