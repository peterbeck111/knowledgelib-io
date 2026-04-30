import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class Knowledgelib implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Knowledgelib',
		name: 'knowledgelib',
		icon: 'file:knowledgelib.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Query pre-verified, cited knowledge units from knowledgelib.io. Flow: 1) Search first with Query Knowledge, 2) Use what you find, 3) If no match, use Suggest Question so it gets created.',
		defaults: {
			name: 'Knowledgelib',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'knowledgelibApi',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Query Knowledge',
						value: 'query',
						description: 'Search across all knowledge units by relevance',
						action: 'Search knowledge units',
					},
					{
						name: 'Get Unit',
						value: 'getUnit',
						description: 'Retrieve a specific knowledge unit by ID',
						action: 'Get a knowledge unit',
					},
					{
						name: 'List Domains',
						value: 'listDomains',
						description: 'List all available knowledge domains and unit counts',
						action: 'List all domains',
					},
					{
						name: 'Suggest Question',
						value: 'suggestQuestion',
						description: 'ALWAYS use when Query returns no results. Submits a topic request so it gets created. Popular suggestions are prioritized.',
						action: 'Suggest a knowledge topic',
					},
					{
						name: 'Report Issue',
						value: 'reportIssue',
						description: 'Flag incorrect, outdated, or broken content on a knowledge unit',
						action: 'Report a content issue',
					},
				],
				default: 'query',
			},
			// --- Query operation ---
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['query'] } },
				description: 'Search query (e.g., "best wireless earbuds under 150")',
				placeholder: 'best wireless earbuds under 150',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 20 },
				displayOptions: { show: { operation: ['query'] } },
				description: 'Max number of results to return',
			},
			{
				displayName: 'Domain Filter',
				name: 'domain',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['query'] } },
				description:
					'Filter by domain (e.g., "consumer_electronics", "computing", "home", "fitness")',
			},
			{
				displayName: 'Region Filter',
				name: 'region',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['query'] } },
				description:
					'Filter by region (e.g., "US", "EU", "global"). Units with region "global" always match.',
			},
			{
				displayName: 'Jurisdiction Filter',
				name: 'jurisdiction',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['query'] } },
				description:
					'Filter by jurisdiction (e.g., "US", "EU", "UK", "global"). Relevant for energy, legal, compliance content.',
			},
			{
				displayName: 'Entity Type Filter',
				name: 'entityType',
				type: 'options',
				options: [
					{ name: 'All Types', value: '' },
					{ name: 'Product Comparison', value: 'product_comparison' },
					{ name: 'Software Reference', value: 'software_reference' },
					{ name: 'Fact', value: 'fact' },
					{ name: 'Concept', value: 'concept' },
					{ name: 'Rule', value: 'rule' },
				],
				default: '',
				displayOptions: { show: { operation: ['query'] } },
				description: 'Filter by entity type',
			},
			{
				displayName: 'Fetch Full Content',
				name: 'fetchFullContent',
				type: 'boolean',
				default: false,
				displayOptions: { show: { operation: ['query'] } },
				description:
					'Whether to fetch the full markdown content of each matching unit (increases response size)',
			},
			// --- Get Unit operation ---
			{
				displayName: 'Unit ID',
				name: 'unitId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['getUnit'] } },
				description:
					'Unit ID path (e.g., "consumer-electronics/audio/wireless-earbuds-under-150/2026")',
				placeholder:
					'consumer-electronics/audio/wireless-earbuds-under-150/2026',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{ name: 'Markdown', value: 'md' },
					{ name: 'JSON', value: 'json' },
				],
				default: 'md',
				displayOptions: { show: { operation: ['getUnit'] } },
				description:
					'Response format: raw markdown or structured JSON with parsed frontmatter',
			},
			// --- Suggest Question operation ---
			{
				displayName: 'Question',
				name: 'suggestQuestion',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['suggestQuestion'] } },
				description: 'The question to suggest (10-500 characters)',
				placeholder: 'What are the best robot vacuums under $500 in 2026?',
			},
			{
				displayName: 'Context',
				name: 'suggestContext',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['suggestQuestion'] } },
				description: 'Optional context about why this question matters',
			},
			{
				displayName: 'Domain Hint',
				name: 'suggestDomain',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['suggestQuestion'] } },
				description: 'Optional domain hint (e.g., "home", "consumer_electronics", "software")',
			},
			// --- Report Issue operation ---
			{
				displayName: 'Card ID',
				name: 'issueCardId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['reportIssue'] } },
				description: 'The knowledge unit ID (e.g., "consumer-electronics/audio/wireless-earbuds-under-150/2026")',
				placeholder: 'consumer-electronics/audio/wireless-earbuds-under-150/2026',
			},
			{
				displayName: 'Issue Type',
				name: 'issueType',
				type: 'options',
				options: [
					{ name: 'Outdated', value: 'outdated', description: 'Information is no longer current' },
					{ name: 'Incorrect', value: 'incorrect', description: 'Factual error in the content' },
					{ name: 'Broken Link', value: 'broken_link', description: 'Source URL or affiliate link is dead' },
					{ name: 'Missing Info', value: 'missing_info', description: 'Important information is absent' },
					{ name: 'Other', value: 'other', description: 'Other issue' },
				],
				default: 'outdated',
				required: true,
				displayOptions: { show: { operation: ['reportIssue'] } },
				description: 'Type of issue being reported',
			},
			{
				displayName: 'Description',
				name: 'issueDescription',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { operation: ['reportIssue'] } },
				description: 'Describe the issue (10-2000 characters). Be specific about what is wrong.',
				placeholder: 'The recommended model XYZ has been discontinued as of January 2026',
			},
			{
				displayName: 'Severity',
				name: 'issueSeverity',
				type: 'options',
				options: [
					{ name: 'Low', value: 'low', description: 'Minor issue, cosmetic or non-blocking' },
					{ name: 'Medium', value: 'medium', description: 'Incorrect detail that could mislead' },
					{ name: 'High', value: 'high', description: 'Significantly wrong recommendation' },
					{ name: 'Critical', value: 'critical', description: 'Dangerous or harmful advice' },
				],
				default: 'medium',
				displayOptions: { show: { operation: ['reportIssue'] } },
				description: 'Severity of the issue',
			},
			{
				displayName: 'Section',
				name: 'issueSection',
				type: 'string',
				default: '',
				displayOptions: { show: { operation: ['reportIssue'] } },
				description: 'Which section of the unit has the issue (e.g., "Quick Reference", "Decision Logic")',
			},
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		// Resolve API base URL and optional key
		let apiUrl = 'https://knowledgelib.io';
		let apiKey = '';
		try {
			const creds = await this.getCredentials('knowledgelibApi');
			if (creds) {
				apiUrl = (creds.apiUrl as string) || apiUrl;
				apiKey = (creds.apiKey as string) || '';
			}
		} catch {
			// Credentials not configured — use public defaults
		}

		const headers: Record<string, string> = {
			'User-Agent': 'knowledgelib-n8n/0.2.0',
		};
		if (apiKey) {
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'query') {
					const query = this.getNodeParameter('query', i) as string;
					const limit = this.getNodeParameter('limit', i) as number;
					const domain = this.getNodeParameter('domain', i) as string;
					const region = this.getNodeParameter('region', i) as string;
					const jurisdiction = this.getNodeParameter('jurisdiction', i) as string;
					const entityType = this.getNodeParameter('entityType', i) as string;
					const fetchFull = this.getNodeParameter(
						'fetchFullContent',
						i,
					) as boolean;

					const qs: Record<string, string | number> = {
						q: query,
						limit,
					};
					if (domain) qs.domain = domain;
					if (region) qs.region = region;
					if (jurisdiction) qs.jurisdiction = jurisdiction;
					if (entityType) qs.entity_type = entityType;

					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${apiUrl}/api/v1/query`,
						qs,
						headers: { ...headers, Accept: 'application/json' },
						json: true,
					});

					// Optionally fetch full markdown for each result
					if (fetchFull && response.results) {
						for (const result of response.results) {
							try {
								const md = await this.helpers.httpRequest({
									method: 'GET',
									url: `${apiUrl}/api/v1/units/${result.id}.md`,
									headers: {
										...headers,
										Accept: 'text/markdown',
									},
									json: false,
									encoding: 'text',
								});
								result.full_content = md;
							} catch {
								result.full_content = null;
							}
						}
					}

					returnData.push({ json: response });
				} else if (operation === 'getUnit') {
					const unitId = this.getNodeParameter('unitId', i) as string;
					const format = this.getNodeParameter('format', i) as string;

					if (format === 'json') {
						const response = await this.helpers.httpRequest({
							method: 'GET',
							url: `${apiUrl}/api/v1/units/${unitId}.json`,
							headers: {
								...headers,
								Accept: 'application/json',
							},
							json: true,
						});
						returnData.push({ json: response });
					} else {
						const content = await this.helpers.httpRequest({
							method: 'GET',
							url: `${apiUrl}/api/v1/units/${unitId}.md`,
							headers: { ...headers, Accept: 'text/markdown' },
							json: false,
							encoding: 'text',
						});
						returnData.push({
							json: { id: unitId, format: 'markdown', content },
						});
					}
				} else if (operation === 'listDomains') {
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${apiUrl}/catalog.json`,
						headers: { ...headers, Accept: 'application/json' },
						json: true,
					});

					returnData.push({
						json: {
							total_units: response.total_units,
							domains: response.domains,
						},
					});
				} else if (operation === 'suggestQuestion') {
					const question = this.getNodeParameter('suggestQuestion', i) as string;
					const suggestContext = this.getNodeParameter('suggestContext', i) as string;
					const suggestDomain = this.getNodeParameter('suggestDomain', i) as string;

					const body: Record<string, string> = { question };
					if (suggestContext) body.context = suggestContext;
					if (suggestDomain) body.domain = suggestDomain;

					const response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${apiUrl}/api/v1/suggest`,
						headers: {
							...headers,
							'Content-Type': 'application/json',
							Accept: 'application/json',
						},
						body,
						json: true,
					});

					returnData.push({ json: response });
				} else if (operation === 'reportIssue') {
					const cardId = this.getNodeParameter('issueCardId', i) as string;
					const issueType = this.getNodeParameter('issueType', i) as string;
					const description = this.getNodeParameter('issueDescription', i) as string;
					const severity = this.getNodeParameter('issueSeverity', i) as string;
					const section = this.getNodeParameter('issueSection', i) as string;

					const body: Record<string, string> = {
						card_id: cardId,
						type: issueType,
						description,
						severity,
					};
					if (section) body.section = section;

					const response = await this.helpers.httpRequest({
						method: 'POST',
						url: `${apiUrl}/api/v1/feedback`,
						headers: {
							...headers,
							'Content-Type': 'application/json',
							Accept: 'application/json',
						},
						body,
						json: true,
					});

					returnData.push({ json: response });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
