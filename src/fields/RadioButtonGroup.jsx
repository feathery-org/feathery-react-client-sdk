import React, { useState } from 'react';
import ReactForm from 'react-bootstrap/Form';

function RadioButtonGroup({
    field,
    fieldLabel,
    fieldVal,
    otherVal,
    onChange,
    handleOtherStateChange,
    onClick,
    selectCSS,
    hoverCSS
}) {
    const [otherSelect, setOtherSelect] = useState({});

    const servar = field.servar;
    return (
        <>
            {fieldLabel}
            {servar.metadata.options.map((opt) => {
                return (
                    <ReactForm.Check
                        type='radio'
                        id={`${servar.key}-${opt}`}
                        label={opt}
                        checked={fieldVal === opt}
                        required={servar.required}
                        onChange={onChange}
                        onClick={onClick}
                        value={opt}
                        key={opt}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '5px'
                        }}
                    />
                );
            })}
            {servar.metadata.other && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    <ReactForm.Check
                        type='radio'
                        id={`${servar.key}-`}
                        label='Other'
                        checked={
                            (otherSelect[servar.key] || fieldVal) &&
                            fieldVal === otherVal
                        }
                        onChange={(e) => {
                            setOtherSelect({
                                ...otherSelect,
                                [servar.key]: true
                            });
                            onChange(e);
                        }}
                        onClick={onClick}
                        value={otherVal || ''}
                        key={otherVal}
                        style={{
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    />
                    <ReactForm.Control
                        type='text'
                        style={{
                            marginLeft: '5px',
                            height: `${parseInt(field.font_size) + 4}px`,
                            backgroundColor: `#${field.background_color}`,
                            border: `${field.border_width}px solid`,
                            borderColor: `#${field.border_top_color} #${field.border_right_color} #${field.border_bottom_color} #${field.border_left_color}`,
                            boxShadow: `${field.shadow_x_offset}px ${field.shadow_y_offset}px ${field.shadow_blur_radius}px #${field.shadow_color}`,
                            color: `#${field.font_color}`,
                            fontStyle: field.font_italic ? 'italic' : 'normal',
                            fontWeight: field.font_weight,
                            fontFamily: field.font_family,
                            fontSize: `${field.font_size}px`
                        }}
                        css={{
                            '&:focus': {
                                boxShadow: `${field.shadow_x_offset}px ${field.shadow_y_offset}px ${field.shadow_blur_radius}px #${field.shadow_color} !important`,
                                ...selectCSS
                            },
                            '&:hover': hoverCSS
                        }}
                        id={servar.key}
                        value={otherVal || ''}
                        onChange={(e) => {
                            const newValues = handleOtherStateChange(otherVal)(
                                e
                            );
                            onChange(e, newValues);
                        }}
                        onClick={onClick}
                        maxLength={servar.max_length}
                        minLength={servar.min_length}
                    />
                </div>
            )}
        </>
    );
}

export default RadioButtonGroup;
