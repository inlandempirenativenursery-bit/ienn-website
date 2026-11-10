One file per approved care sheet (batch 2+). Each `<slug>.json` holds the exact Eric-approved copy for one species key in
`data/plant-basics.js` (`iennCare(...)` block). `tests/care-sheets.test.js` checks every spec word for word and that the set of
species with care equals Yarrow + White sage + these specs, so dropping one plant's commit (data block + spec) keeps tests green.
