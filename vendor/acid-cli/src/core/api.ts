import type { paths } from "../generated/types.ts";

// This interface is the contract every backend (originally the app.acai.sh
// SaaS, now the local fossil ticket store in fossil-client.ts) must satisfy.
// The response shapes still reference the original OpenAPI-generated types
// from ../generated/types.ts — they describe a stable data contract, not a
// dependency on the SaaS itself, so push.ts/feature.ts/features.ts/
// set-status.ts can keep destructuring `response.data.*` unchanged.

export interface ListImplementationEntry {
	implementation_id: string;
	implementation_name: string;
	product_name?: string;
}

export interface ListImplementationsResponse {
	data: {
		product_name?: string;
		repo_uri?: string;
		branch_name?: string;
		implementations: ListImplementationEntry[];
	};
}

export interface ApiClient {
	listImplementations(input: {
		productName?: string;
		repoUri?: string;
		branchName?: string;
		featureName?: string;
	}): Promise<ListImplementationsResponse>;
	listImplementationFeatures(input: {
		productName: string;
		implementationName: string;
		statuses?: string[];
		changedSinceCommit?: string;
	}): Promise<
		paths["/implementation-features"]["get"]["responses"][200]["content"]["application/json"]
	>;
	getFeatureContext(input: {
		productName: string;
		featureName: string;
		implementationName: string;
		includeRefs?: boolean;
		statuses?: string[];
	}): Promise<
		paths["/feature-context"]["get"]["responses"][200]["content"]["application/json"]
	>;
	setFeatureStates(
		input: NonNullable<
			paths["/feature-states"]["patch"]["requestBody"]
		>["content"]["application/json"],
	): Promise<
		paths["/feature-states"]["patch"]["responses"][200]["content"]["application/json"]
	>;
	push(
		input: NonNullable<
			paths["/push"]["post"]["requestBody"]
		>["content"]["application/json"],
	): Promise<
		paths["/push"]["post"]["responses"][200]["content"]["application/json"]
	>;
}
