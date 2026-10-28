/**
 * Framework-independent engineering policy.
 *
 * This package is the inward boundary for policy that must not depend on
 * Electron, React, databases, or provider SDKs. The scaffold establishes the
 * boundary only. It does not define workflow behavior.
 */
export const ENGINEERING_POLICY_STATUS = "unspecified" as const;

export type EngineeringPolicyStatus = typeof ENGINEERING_POLICY_STATUS;
