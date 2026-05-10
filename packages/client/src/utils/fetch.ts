import { router } from "@/main";
import { type AnyAPIResponseSchema } from "@exsit/shared/types/api";
import { toast } from "@heroui/react";
import { z } from "zod";

type SchemaDataType<TOut extends AnyAPIResponseSchema> = Extract<
	z.infer<TOut>,
	{ data: unknown }
>["data"];
type SchemaErrorsType<TOut extends AnyAPIResponseSchema> = NonNullable<
	Extract<z.infer<TOut>, { error: string }>["error"]
>;

export const defaultHandler = <TOut extends AnyAPIResponseSchema>(
	result: ExpandedFetchResult<TOut>,
	options: {
		onSuccess?: (data: SchemaDataType<TOut>) => void;
		onError?: (code: SchemaErrorsType<TOut>) => void;
		showToast?: boolean;
		errorMessages?: Record<Exclude<SchemaErrorsType<TOut>, "validation" | "internal">, string>;
	},
) => {
	if (result.ok) {
		options.onSuccess?.(result.data);
		return;
	}

	console.error(result);
	switch (result.error) {
		case "fetch":
			if (options.showToast ?? true)
				toast.danger("Не удалось установить соединение с сервером", {
					description: `${result.exception}`,
				});
			return;
		case "malformed_response":
			if (options.showToast ?? true)
				toast.danger("Сервер вернул ответ в неправильном формате", {
					description: z.prettifyError(result.parseErrors),
				});
			return;
		case "api":
			if ((options.showToast ?? true) && options.errorMessages)
				toast.danger(
					(
						{
							...options.errorMessages,
							validation: "Ошибка валидации данных",
							internal: "На сервере произошла ошибка",
						} as Record<SchemaErrorsType<TOut>, string>
					)[result.code],
				);
			options.onError?.(result.code);
			return;
	}
};

export type ExpandedFetchResultMetadata = {
	path: string;
	query: Record<string, string | number>;
	body?: Record<string, unknown>;
};
export type ExpandedFetchResult<TOut extends AnyAPIResponseSchema> = {
	meta: ExpandedFetchResultMetadata;
} & (
	| { ok: true; data: SchemaDataType<TOut> }
	| { ok: false; error: "api"; code: SchemaErrorsType<TOut> }
	| { ok: false; error: "fetch"; exception: unknown }
	| { ok: false; error: "malformed_response"; parseErrors: z.ZodError<z.output<TOut>> }
);

export const route = (path: string) => `${import.meta.env.VITE_API_URL}${path}`;
export const expandedFetch = async <TOut extends AnyAPIResponseSchema>(
	path: string,
	options: RequestInit & {
		output: TOut;
		query?: Record<string, string | number>;
		jsonBody?: Record<string, unknown>;
	},
): Promise<ExpandedFetchResult<TOut>> => {
	const meta: ExpandedFetchResultMetadata = {
		path,
		query: options.query ?? {},
		body: options.jsonBody,
	};

	let finalOptions: RequestInit = options.jsonBody
		? {
				...options,
				body: JSON.stringify(options.jsonBody),
				headers: { ...(options.headers ?? {}), "Content-Type": "application/json" },
				credentials: "include",
			}
		: { ...options, credentials: "include" };
	let finalPath: string = options.query
		? path + `?${new URLSearchParams(options.query as Record<string, string>).toString()}`
		: path;

	let json: Record<string, unknown> = {};
	try {
		const result = await fetch(route(finalPath), finalOptions);
		if (result.status === 401 && router.state.location.pathname !== "/login")
			window.location.href = "/login";
		json = await result.json();
	} catch (exception) {
		return { ok: false, error: "fetch", exception, meta };
	}

	const parseResult = options.output.safeParse(json);
	if (!parseResult.success)
		return { ok: false, error: "malformed_response", parseErrors: parseResult.error, meta };
	if (parseResult.data.error !== null)
		return { ok: false, error: "api", code: parseResult.data.error, meta };
	return { ok: true, data: parseResult.data.data, meta };
};
