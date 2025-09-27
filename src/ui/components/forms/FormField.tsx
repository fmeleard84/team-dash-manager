import React from 'react';
import {
  Control,
  FieldPath,
  FieldValues,
  Controller,
  ControllerRenderProps,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/ui/components/input';
import { Textarea } from '@/ui/components/textarea';
import { Label } from '@/ui/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/select';
import { Checkbox } from '@/ui/components/checkbox';
import { RadioGroup, RadioGroupItem } from '@/ui/components/radio-group';
import { Switch } from '@/ui/components/switch';
import { AlertCircle } from 'lucide-react';

interface BaseFormFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
  className?: string;
}

interface InputFieldProps<TFieldValues extends FieldValues> extends BaseFormFieldProps<TFieldValues> {
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
}

interface TextareaFieldProps<TFieldValues extends FieldValues> extends BaseFormFieldProps<TFieldValues> {
  type: 'textarea';
  placeholder?: string;
  rows?: number;
}

interface SelectFieldProps<TFieldValues extends FieldValues> extends BaseFormFieldProps<TFieldValues> {
  type: 'select';
  placeholder?: string;
  options: Array<{ value: string; label: string }>;
}

interface CheckboxFieldProps<TFieldValues extends FieldValues> extends BaseFormFieldProps<TFieldValues> {
  type: 'checkbox';
}

interface RadioFieldProps<TFieldValues extends FieldValues> extends BaseFormFieldProps<TFieldValues> {
  type: 'radio';
  options: Array<{ value: string; label: string }>;
}

interface SwitchFieldProps<TFieldValues extends FieldValues> extends BaseFormFieldProps<TFieldValues> {
  type: 'switch';
}

type FormFieldProps<TFieldValues extends FieldValues> =
  | InputFieldProps<TFieldValues>
  | TextareaFieldProps<TFieldValues>
  | SelectFieldProps<TFieldValues>
  | CheckboxFieldProps<TFieldValues>
  | RadioFieldProps<TFieldValues>
  | SwitchFieldProps<TFieldValues>;

export function FormField<TFieldValues extends FieldValues = FieldValues>(
  props: FormFieldProps<TFieldValues>
) {
  const { control, name, label, description, required, className } = props;

  const renderField = (
    field: ControllerRenderProps<TFieldValues>,
    fieldState: { error?: { message?: string } }
  ) => {
    switch (props.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
      case 'tel':
      case 'url':
        return (
          <Input
            {...field}
            type={props.type}
            placeholder={props.placeholder}
            className={cn(
              'rounded-xl',
              fieldState.error && 'border-error focus:ring-error'
            )}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...field}
            placeholder={props.placeholder}
            rows={props.rows || 4}
            className={cn(
              'rounded-xl resize-none',
              fieldState.error && 'border-error focus:ring-error'
            )}
          />
        );

      case 'select':
        return (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger 
              className={cn(
                'rounded-xl',
                fieldState.error && 'border-error focus:ring-error'
              )}
            >
              <SelectValue placeholder={props.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {props.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              className={cn(fieldState.error && 'border-error')}
            />
            {label && (
              <Label htmlFor={name} className="text-sm font-medium cursor-pointer">
                {label}
                {required && <span className="text-error ml-1">*</span>}
              </Label>
            )}
          </div>
        );

      case 'radio':
        return (
          <RadioGroup value={field.value} onValueChange={field.onChange}>
            {props.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                <Label htmlFor={`${name}-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            {label && (
              <Label htmlFor={name} className="cursor-pointer">
                {label}
                {required && <span className="text-error ml-1">*</span>}
              </Label>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className={cn('space-y-2', className)}>
          {label && props.type !== 'checkbox' && props.type !== 'switch' && (
            <Label htmlFor={name} className="text-sm font-medium">
              {label}
              {required && <span className="text-error ml-1">*</span>}
            </Label>
          )}
          
          {renderField(field, fieldState)}
          
          {description && !fieldState.error && (
            <p className="text-sm text-fg/70">{description}</p>
          )}
          
          {fieldState.error && (
            <div className="flex items-center gap-2 text-error">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{fieldState.error.message}</p>
            </div>
          )}
        </div>
      )}
    />
  );
}

interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGroup({ children, className }: FormGroupProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  );
}

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="pb-2 border-b border-border">
          {title && <h3 className="text-lg font-semibold text-fg">{title}</h3>}
          {description && <p className="text-sm text-fg/70 mt-1">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}