// components/ui — barrel export
// Importa todos los componentes UI base desde un único punto de entrada.
//
// Uso: import { Button, Input, Modal, Badge, Label, Card, Form } from "@/components/ui";

export { Button } from "./Button";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./Button";

export { Input } from "./Input";
export type { InputProps, InputSize } from "./Input";

export { Modal } from "./Modal";
export type { ModalProps, ModalSize } from "./Modal";

export { Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

export {
    Badge,
    ProductStatusBadge,
    MovementTypeBadge,
    RoleBadge,
} from "./Badge";
export type { BadgeProps, BadgeVariant, BadgeSize } from "./Badge";

export { Label } from "./Label";
export type { LabelProps, LabelSize } from "./Label";

export {
    Card,
    CardHeader,
    CardBody,
    CardDivider,
    CardFooter,
    StatCard,
} from "./Card";
export type {
    CardProps,
    CardVariant,
    CardPadding,
    CardHeaderProps,
    CardBodyProps,
    CardFooterProps,
    StatCardProps,
} from "./Card";

export {
    Form,
    FormField,
    FormSection,
    FormRow,
    FormActions,
    useFormContext,
} from "./Form";
export type {
    FormProps,
    FormFieldProps,
    FormSectionProps,
    FormRowProps,
    FormActionsProps,
} from "./Form";

export { ThemeToggle } from "./ThemeToggle";
export type { ThemeToggleProps } from "./ThemeToggle";
