const fs = require('fs');
const fetch = require('node-fetch');

const apiRootUrl = "https://api.coinmetrics.io/v3";
const communityApiRootUrl = "https://community-api.coinmetrics.io/v3";

const apiKey = null;

const apiFetch = async (path) => {
	return await (await fetch((apiKey ? apiRootUrl : communityApiRootUrl) + path, apiKey ? {
		headers: {
			Authorization: apiKey
		}
	} : {})).json();
};

const csvEscape = (s) => `"${s.replace(/"/g, "\"\"")}"`;

(async () => {
	// retrieve asset info for all assets available
	const assetsInfos = {};
	(await apiFetch("/asset_info")).assetsInfo.forEach(assetInfo => {
		assetsInfos[assetInfo.id] = assetInfo;
	});

	// list of asset ids
	const assets = Object.keys(assetsInfos).sort();

	// retrieve metrics for every asset
	for(let i = 0; i < assets.length; ++i) {
		const asset = assets[i];
		const assetInfo = assetsInfos[asset];

		// fetch data
		console.log(`Fetching ${asset} data...`);
		const metricdata = (await apiFetch(`/assets/${asset}/metricdata?metrics=${encodeURIComponent(assetInfo.metrics.join(","))}`)).metricData;

		// compose CSV
		const csv = `time,${metricdata.metrics.join(',')}\n${
			metricdata.series.map((series) =>
				`${series.time.substr(0, 10)}${series.values.map(value => `,${(value === null || value === undefined) ? '' : value}`).join('')}\n`
			).join('')}`;

		// write to file
		fs.writeFileSync(`${process.env.OUT}/${asset}.csv`, csv);
	};

	// retrieve metrics info and write to file
	fs.writeFileSync(`${process.env.OUT}/metrics.csv`,
		`id,name,category,subcategory,type,unit,interval,interval_rt,description\n${
			(await apiFetch("/metric_info")).metricsInfo.map(metricInfo =>
				`${
					metricInfo.id
				},${
					csvEscape(metricInfo.name)
				},${
					csvEscape(metricInfo.category)
				},${
					csvEscape(metricInfo.subcategory)
				},${
					csvEscape(metricInfo.metricType)
				},${
					csvEscape(metricInfo.unit)
				},${
					csvEscape(metricInfo.interval)
				},${
					csvEscape(metricInfo.interval_rt || '')
				},${
					csvEscape(metricInfo.description)
				}\n`
	).join('')}`);

})();
