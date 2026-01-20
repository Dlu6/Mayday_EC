// electron-softphone/src/components/DynamicFormField.jsx
import React from "react";
import {
    TextField,
    FormControl,
    FormControlLabel,
    FormLabel,
    FormGroup,
    FormHelperText,
    InputLabel,
    Select,
    MenuItem,
    Radio,
    RadioGroup,
    Checkbox,
    Slider,
    Box,
    Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

/**
 * DynamicFormField - Renders form fields dynamically based on schema
 * 
 * @param {Object} field - Field definition from form schema
 * @param {any} value - Current field value
 * @param {Function} onChange - Callback when value changes
 * @param {string} error - Error message if validation failed
 */
const DynamicFormField = ({ field, value, onChange, error }) => {
    const handleChange = (newValue) => {
        onChange(field.id, newValue);
    };

    const commonProps = {
        fullWidth: true,
        error: !!error,
        helperText: error || field.helperText,
        size: "small",
        sx: { mb: 2 },
    };

    switch (field.type) {
        case "text":
            return (
                <TextField
                    {...commonProps}
                    label={field.label}
                    value={value || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                />
            );

        case "textarea":
            return (
                <TextField
                    {...commonProps}
                    label={field.label}
                    value={value || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    multiline
                    rows={field.rows || 4}
                />
            );

        case "number":
            return (
                <TextField
                    {...commonProps}
                    type="number"
                    label={field.label}
                    value={value || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    inputProps={{
                        min: field.min,
                        max: field.max,
                        step: field.step || 1,
                    }}
                />
            );

        case "select":
            return (
                <FormControl {...commonProps} required={field.required}>
                    <InputLabel>{field.label}</InputLabel>
                    <Select
                        value={value || ""}
                        onChange={(e) => handleChange(e.target.value)}
                        label={field.label}
                    >
                        <MenuItem value="">
                            <em>Select...</em>
                        </MenuItem>
                        {(field.options || []).map((option, idx) => (
                            <MenuItem key={idx} value={option}>
                                {option}
                            </MenuItem>
                        ))}
                    </Select>
                    {error && <FormHelperText error>{error}</FormHelperText>}
                </FormControl>
            );

        case "radio":
            return (
                <FormControl {...commonProps} required={field.required} component="fieldset">
                    <FormLabel component="legend">{field.label}</FormLabel>
                    <RadioGroup
                        value={value || ""}
                        onChange={(e) => handleChange(e.target.value)}
                    >
                        {(field.options || []).map((option, idx) => (
                            <FormControlLabel
                                key={idx}
                                value={option}
                                control={<Radio size="small" />}
                                label={option}
                            />
                        ))}
                    </RadioGroup>
                    {error && <FormHelperText error>{error}</FormHelperText>}
                </FormControl>
            );

        case "checkbox":
            // For checkbox, value is an array of selected options
            const selectedValues = Array.isArray(value) ? value : [];

            const handleCheckboxChange = (option, checked) => {
                if (checked) {
                    handleChange([...selectedValues, option]);
                } else {
                    handleChange(selectedValues.filter((v) => v !== option));
                }
            };

            return (
                <FormControl {...commonProps} component="fieldset">
                    <FormLabel component="legend">{field.label}</FormLabel>
                    <FormGroup>
                        {(field.options || []).map((option, idx) => (
                            <FormControlLabel
                                key={idx}
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={selectedValues.includes(option)}
                                        onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                                    />
                                }
                                label={option}
                            />
                        ))}
                    </FormGroup>
                    {error && <FormHelperText error>{error}</FormHelperText>}
                </FormControl>
            );

        case "date":
            return (
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                        label={field.label}
                        value={value ? dayjs(value) : null}
                        onChange={(newValue) => handleChange(newValue?.toISOString() || null)}
                        slotProps={{
                            textField: {
                                ...commonProps,
                                required: field.required,
                            },
                        }}
                    />
                </LocalizationProvider>
            );

        case "scale":
            const min = field.min || 1;
            const max = field.max || 5;
            const step = field.step || 1;
            const marks = [];
            for (let i = min; i <= max; i += step) {
                marks.push({ value: i, label: String(i) });
            }

            return (
                <Box sx={{ ...commonProps, px: 2 }}>
                    <Typography gutterBottom>{field.label}</Typography>
                    <Slider
                        value={value || min}
                        onChange={(e, newValue) => handleChange(newValue)}
                        min={min}
                        max={max}
                        step={step}
                        marks={marks}
                        valueLabelDisplay="auto"
                    />
                    {error && <FormHelperText error>{error}</FormHelperText>}
                </Box>
            );

        default:
            return (
                <TextField
                    {...commonProps}
                    label={field.label}
                    value={value || ""}
                    onChange={(e) => handleChange(e.target.value)}
                    placeholder={field.placeholder}
                    helperText={`Unknown field type: ${field.type}`}
                />
            );
    }
};

export default DynamicFormField;
