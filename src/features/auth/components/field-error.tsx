export function FormFieldError({
  errors,
}: {
  errors: string[] | undefined;
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="text-xs text-destructive" role="alert">
      {errors[0]}
    </p>
  );
}
