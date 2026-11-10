/**
 * Reglas de posición (alineadas con backend position_flags):
 * - inactiva → no push ni picking
 * - push y picking mutuamente excluyentes
 */

export function canEnablePicking({ is_active, is_push } = {}) {
  return Boolean(is_active) && !Boolean(is_push);
}

export function canEnablePush({ is_active } = {}) {
  return Boolean(is_active);
}

export function withActiveChange(flags, isActive) {
  if (isActive) return { ...flags, is_active: true };
  return { ...flags, is_active: false, is_picking: false, is_push: false };
}

export function withPickingChange(flags, isPicking) {
  if (isPicking && !canEnablePicking(flags)) return flags;
  return {
    ...flags,
    is_picking: Boolean(isPicking),
    ...(isPicking ? { is_push: false } : {}),
  };
}

export function withPushChange(flags, isPush) {
  if (isPush && !canEnablePush(flags)) return flags;
  return {
    ...flags,
    is_push: Boolean(isPush),
    ...(isPush ? { is_picking: false } : {}),
  };
}

/** Mensaje corto o null si es válido. */
export function positionFlagsError({ is_active, is_picking, is_push } = {}) {
  if (!is_active) {
    if (is_push) return "No se puede activar push en una posición inactiva.";
    if (is_picking) return "No se puede activar picking en una posición inactiva.";
    return null;
  }
  if (is_push && is_picking) {
    return "Push y picking no pueden estar activos a la vez.";
  }
  return null;
}
