import { eq, isNull, SQL } from "drizzle-orm";
import { AnyColumn } from "drizzle-orm/column";

export const eqOrNull = <TColumn extends AnyColumn>(
	column: TColumn,
	value: TColumn["_"]["data"] | null,
): SQL => (value === null ? isNull(column) : eq(column, value));
