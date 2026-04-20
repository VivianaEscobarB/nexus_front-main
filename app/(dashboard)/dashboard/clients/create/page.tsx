"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormActions, FormRow, FormSection } from "@/components/ui/Form";
import { Button, Card, CardBody, Input, Select } from "@/components/ui";
import { RoleGuard } from "@/modules/auth";
import { createClient, persistClientCreateSuccessMessage } from "@/modules/clients";
import {
    listCitiesByRegion,
    listCountries,
    listRegionsByCountry,
    type LocationCity,
    type LocationRegion,
} from "@/modules/locations";
import { isApiError } from "@/shared/api/apiError";
import { UserRole } from "@/types";

function ArrowLeftIcon() {
    return (
        <svg
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-4 w-4"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
        </svg>
    );
}

const DOCUMENT_TYPE_OPTIONS = [
    { value: "NIT", label: "NIT" },
    { value: "CC", label: "Cedula de ciudadania" },
    { value: "CE", label: "Cedula de extranjeria" },
    { value: "PASSPORT", label: "Pasaporte" },
] as const;

const createClientSchema = z
    .object({
        documentType: z.enum(["NIT", "CC", "CE", "PASSPORT"], {
            message: "Seleccione un tipo de documento",
        }),
        documentNumber: z
            .string()
            .trim()
        .min(1, "El número de documento es obligatorio"),
        businessName: z
            .string()
            .trim()
        .min(1, "La razón social o nombre de empresa es obligatoria"),
        name: z
            .string()
            .trim()
            .min(1, "El nombre del contacto es obligatorio"),
        email: z
            .string()
            .trim()
            .min(1, "El correo es obligatorio")
        .email("Debe ser un correo electrónico válido"),
        phone: z
            .string()
            .trim()
            .min(7, "El teléfono debe ser válido"),
        address: z
            .string()
            .trim()
            .min(5, "La dirección es obligatoria"),
        countryId: z.string().optional(),
        regionId: z.string().optional(),
        cityId: z
            .string()
            .trim()
            .min(
                1,
                "Selecciona país, región y ciudad."
            ),
    })
    .superRefine((values, ctx) => {
        if (!Number.isFinite(Number(values.cityId))) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["cityId"],
                message: "Ciudad invalida. Vuelve a seleccionar.",
            });
        }
    });

type CreateClientFormData = z.infer<typeof createClientSchema>;

function buildDefaultValues(): CreateClientFormData {
    return {
        documentType: "NIT",
        documentNumber: "",
        businessName: "",
        name: "",
        email: "",
        phone: "",
        address: "",
        countryId: "",
        regionId: "",
        cityId: "",
    };
}

function getErrorMessage(error: unknown): string {
    if (isApiError(error)) {
        return error.message;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return "No fue posible registrar el cliente.";
}

export default function CreateClientPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const submitLockRef = React.useRef(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [countries, setCountries] = React.useState<
        { id: number; name: string }[]
    >([]);
    const [regions, setRegions] = React.useState<LocationRegion[]>([]);
    const [cities, setCities] = React.useState<LocationCity[]>([]);
    const [locationsError, setLocationsError] = React.useState<string | null>(
        null
    );

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isValid },
    } = useForm<CreateClientFormData>({
        resolver: zodResolver(createClientSchema),
        mode: "onChange",
        defaultValues: buildDefaultValues(),
    });

    const selectedCountryId = watch("countryId");
    const selectedRegionId = watch("regionId");

    function resetLocationPickers() {
        setRegions([]);
        setCities([]);
        setValue("countryId", "");
        setValue("regionId", "");
        setValue("cityId", "");
    }

    React.useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const list = await listCountries();
                if (!cancelled) {
                    setCountries(
                        [...list].sort((a, b) =>
                            a.name.localeCompare(b.name, "es")
                        )
                    );
                    setLocationsError(null);
                }
            } catch (error) {
                if (!cancelled) {
                    setLocationsError(getErrorMessage(error));
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const onSubmit = async (data: CreateClientFormData) => {
        if (submitLockRef.current) {
            return;
        }

        submitLockRef.current = true;
        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            await createClient({
                name: data.name,
                email: data.email,
                phone: data.phone,
                documentType: data.documentType,
                documentNumber: data.documentNumber,
                businessName: data.businessName,
                address: data.address,
                cityId: Number(data.cityId),
                status: "ACTIVE",
            });

            persistClientCreateSuccessMessage(
                "Prospecto registrado correctamente. El acceso al portal se habilitará tras concretar una venta."
            );
            reset(buildDefaultValues());
            router.replace("/dashboard/clients");
        } catch (error) {
            setErrorMsg(getErrorMessage(error));
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    };

    return (
        <RoleGuard allowedRoles={[UserRole.SALES_AGENT]}>
            <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-500">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-hover)] p-0"
                        disabled={isSubmitting}
                    >
                        <ArrowLeftIcon />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
                            Registrar prospecto comercial
                        </h1>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                            Crea la ficha base del prospecto. Las credenciales de acceso 
                            se generarán tras facturar su primer contrato.
                        </p>
                    </div>
                </div>

                <Card padding="lg">
                    <CardBody>
                        {errorMsg ? (
                            <div
                                role="alert"
                                className="mb-6 rounded-lg border border-[var(--color-danger-default)] bg-[var(--color-danger-subtle)] p-4 text-sm font-medium text-[var(--color-danger-strong)]"
                            >
                                {errorMsg}
                            </div>
                        ) : null}

                        {locationsError ? (
                            <div
                                role="alert"
                                className="mb-6 rounded-lg border border-[var(--color-warning-default)] bg-[var(--color-warning-subtle)] p-4 text-sm font-medium text-[var(--color-warning-strong)]"
                            >
                                {locationsError}
                                <button
                                    type="button"
                                    className="ml-2 underline"
                                    onClick={() => {
                                        setLocationsError(null);
                                        resetLocationPickers();
                                    }}
                                >
                                    Limpiar ubicación
                                </button>
                            </div>
                        ) : null}

                        <Form
                            onSubmit={handleSubmit(onSubmit)}
                            gap="lg"
                            aria-busy={isSubmitting}
                        >
                            <FormSection
                                title="Datos comerciales del prospecto"
                                description="Información base obligatoria para poder generar cotizaciones o contratos."
                            >
                                <FormRow cols={2}>
                                    <Select
                                        label="Tipo de documento"
                                        options={[...DOCUMENT_TYPE_OPTIONS]}
                                        error={errors.documentType?.message}
                                        {...register("documentType")}
                                    />
                                    <Input
                                        label="Número de documento"
                                        placeholder="Ej. 900123456-7"
                                        error={errors.documentNumber?.message}
                                        {...register("documentNumber")}
                                    />
                                </FormRow>

                                <FormRow cols={2}>
                                    <Input
                                        label="Nombre de contacto"
                                        placeholder="Ej. Juan Pérez"
                                        error={errors.name?.message}
                                        {...register("name")}
                                    />
                                    <Input
                                        label="Correo principal"
                                        type="email"
                                        placeholder="contacto@empresa.com"
                                        error={errors.email?.message}
                                        {...register("email")}
                                    />
                                </FormRow>

                                <FormRow cols={2}>
                                    <Input
                                        label="Empresa / razón social"
                                        placeholder="Ej. Importaciones JP"
                                        error={errors.businessName?.message}
                                        {...register("businessName")}
                                    />
                                    <Input
                                        label="Teléfono"
                                        placeholder="+57 300 000 0000"
                                        error={errors.phone?.message}
                                        {...register("phone")}
                                    />
                                </FormRow>

                                <FormRow cols={1}>
                                    <Input
                                        label="Dirección"
                                        placeholder="Cra 12 #34-56, Bodega 5"
                                        error={errors.address?.message}
                                        {...register("address")}
                                    />
                                </FormRow>
                            </FormSection>

                            <FormSection
                                title="Ubicación"
                                description="Selecciona la ubicación comercial del cliente."
                            >
                                <FormRow cols={3}>
                                    <Select
                                        label="País"
                                        options={countries.map((country) => ({
                                            value: String(country.id),
                                            label: country.name,
                                        }))}
                                        disabled={
                                            countries.length === 0 || isSubmitting
                                        }
                                        hint="Selecciona el país del cliente."
                                        {...register("countryId", {
                                            onChange: async (event) => {
                                                const value = event.target.value;
                                                setValue("regionId", "");
                                                setValue("cityId", "");
                                                setCities([]);

                                                if (!value) {
                                                    setRegions([]);
                                                    return;
                                                }

                                                try {
                                                    const regionList =
                                                        await listRegionsByCountry(
                                                            Number(value)
                                                        );
                                                    setRegions(regionList);
                                                    setLocationsError(null);
                                                } catch (error) {
                                                    setRegions([]);
                                                    setLocationsError(
                                                        getErrorMessage(error)
                                                    );
                                                }
                                            },
                                        })}
                                    />
                                    <Select
                                        label="Región"
                                        options={regions.map((region) => ({
                                            value: String(region.id),
                                            label: region.name,
                                        }))}
                                        disabled={
                                            !selectedCountryId || isSubmitting
                                        }
                                        hint="Selecciona la región correspondiente."
                                        {...register("regionId", {
                                            onChange: async (event) => {
                                                const value = event.target.value;
                                                setValue("cityId", "");

                                                if (!value) {
                                                    setCities([]);
                                                    return;
                                                }

                                                try {
                                                    const cityList =
                                                        await listCitiesByRegion(
                                                            Number(value)
                                                        );
                                                    setCities(cityList);
                                                    setLocationsError(null);
                                                } catch (error) {
                                                    setCities([]);
                                                    setLocationsError(
                                                        getErrorMessage(error)
                                                    );
                                                }
                                            },
                                        })}
                                    />
                                    <Select
                                        label="Ciudad"
                                        options={cities.map((city) => ({
                                            value: String(city.id),
                                            label: city.name,
                                        }))}
                                        disabled={
                                            !selectedRegionId || isSubmitting
                                        }
                                        error={errors.cityId?.message}
                                        hint="Selecciona la ciudad del cliente."
                                        {...register("cityId")}
                                    />
                                </FormRow>
                            </FormSection>

                            <FormActions align="between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    isLoading={isSubmitting}
                                    disabled={!isValid || isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Registrando prospecto..."
                                        : "Guardar prospecto"}
                                </Button>
                            </FormActions>
                        </Form>
                    </CardBody>
                </Card>
            </div>
        </RoleGuard>
    );
}
