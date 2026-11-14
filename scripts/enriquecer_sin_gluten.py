"""Enrich existing FomeBoa food venues with explicit gluten-free offer signals.

Only explicit source tags or an Overture gluten_free category may produce the
'options_reported' status. Never infer coeliac safety, licensing, or segregated
kitchens from a name/category, menu, or unspecified source data.
"""
import json
import os
import re
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from datetime import datetime, timezone
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
CAT = ROOT / "catalogo"
STAMP = datetime.now(timezone.utc).strftime("%Y-%m-%d")
BBOX = "-23.8,-46.9,-23.35,-46.36"
ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
QUERY = (
    '[out:json][timeout:35];'
    '(nwr["diet:gluten_free"~"^(yes|only|limited)$"](' + BBOX + '););'
    'out body center;'
)
DECLARED = {"yes", "only", "limited"}
OVERTURE_DIET = {"gluten_free_restaurant", "gluten_free_bakery", "gluten_free_cafe",
                 "gluten_free_coffee_shop", "gluten_free_pastry_shop",
                 "gluten_free_bakery_cafe", "gluten_free_food"}
OSM_ID = re.compile(r"^(node|way|relation)/([0-9]+)$")

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def write(path, obj):
    text = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)
    return True

def fetch_osm_tags():
    errors = []
    for endpoint in ENDPOINTS:
        try:
            request = Request(
                endpoint,
                data=urlencode({"data": QUERY}).encode("utf-8"),
                headers={"User-Agent": "FomeBoaSP-OpenDataQuality/1.0 (github.com/nahuelbaez2011-sketch/fomeboa-br)",
                         "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
                         "Accept": "application/json"},
                method="POST",
            )
            with urlopen(request, timeout=65) as response:
                data = json.load(response)
            elements = data.get("elements", [])
            if not isinstance(elements, list):
                raise ValueError("Unexpected Overpass response")
            tags = {}
            for e in elements:
                value = str(e.get("tags", {}).get("diet:gluten_free", "")).strip().lower()
                if value not in DECLARED:
                    continue
                typ = str(e.get("type", ""))
                ident = e.get("id")
                if typ in ("node", "way", "relation") and isinstance(ident, int):
                    tags[f"{typ}/{ident}"] = value
            return tags, None
        except Exception as error:
            errors.append(f"{endpoint}: {type(error).__name__}: {str(error)[:90]}")
    return {}, "; ".join(errors)

def reported(value, source, source_url):
    return {
        "status": "options_reported",
        "value": value,
        "source": source,
        "sourceUrl": source_url,
        "lastCheckedAt": STAMP,
        "documentVerified": False,
        "crossContactControlled": False,
        "warning": "Options stated by source, not confirmed safe for coeliac disease.",
    }

def classify(venue, osm):
    # A future reviewed certificate must never be overwritten by open data.
    existing = venue.get("glutenFree")
    if isinstance(existing, dict) and existing.get("status") == "verified_for_coeliacs":
        if (existing.get("documentVerified") is True and
                existing.get("crossContactControlled") is True and
                existing.get("sourceUrl") and existing.get("lastVerifiedAt")):
            return existing, "reviewed"
    ident = str(venue.get("id", ""))
    m = OSM_ID.match(ident)
    if not m and venue.get("osmType") and venue.get("osmId"):
        ident = str(venue["osmType"]) + "/" + str(venue["osmId"])
    if ident in osm:
        return reported(osm[ident], "OpenStreetMap (diet:gluten_free)",
                        "https://www.openstreetmap.org/" + ident), "osm_explicit"
    original = str(venue.get("categoryOriginal") or "").lower().strip()
    if (original in OVERTURE_DIET or
            (original.startswith("gluten_free_") and original.endswith(("_restaurant", "_bakery", "_cafe", "_pastry_shop")))):
        source = "Overture Maps (categoría gastronómica)" 
        return reported("yes", source, "https://explore.overturemaps.org/"), "overture_category"
    # Preserve previously sourced positive offers if the source is still linked.
    if (isinstance(existing, dict) and existing.get("status") == "options_reported"
            and existing.get("value") in DECLARED and existing.get("sourceUrl")):
        return existing, "previously_sourced"
    return None, "no_evidence"

def checks():
    fake={"id": "node/12", "name": "Generic bakery", "type": "bakery"}
    evidence, origin = classify(fake, {"node/12": "yes"})
    assert evidence["status"] == "options_reported" and not evidence["documentVerified"]
    assert origin == "osm_explicit"
    assert classify(fake, {})[0] is None
    other={"id": "overture/1", "categoryOriginal": "gluten_free_restaurant"}
    assert classify(other, {})[0]["status"] == "options_reported"
    general={"id": "overture/2", "categoryOriginal": "restaurant", "name": "Sin gluten"}
    assert classify(general, {})[0] is None
    verified={"id": "node/12", "glutenFree":{"status":"verified_for_coeliacs",
               "documentVerified": True,"crossContactControlled":True,
               "sourceUrl":"https://example.com/cert","lastVerifiedAt": STAMP}}
    assert classify(verified, {"node/12":"yes"})[1] == "reviewed"

def main():
    checks()
    catalog_path = CAT / "todos.json"
    catalog = load(catalog_path)
    manifest_path = CAT / "manifest.json"
    manifest = load(manifest_path)
    assert len(catalog) == manifest["total"], "Catalog changed while auditing"
    osm, problem = fetch_osm_tags()
    stats = Counter()
    by_id = {}
    examples = []
    for item in catalog:
        evidence, origin = classify(item, osm)
        if evidence:
            item["glutenFree"] = evidence
            stats[origin] += 1
            if len(examples) < 40:
                examples.append({"id":item["id"],"name":item.get("name",""),
                                 "zone":item.get("zones", [""])[0],
                                 "evidence":origin,"sourceUrl":evidence["sourceUrl"]})
        else:
            item.pop("glutenFree", None)
            stats["no_evidence"] += 1
        by_id[item["id"]] = item
    assert len(by_id) == len(catalog), "Catalog ID mismatch"
    changed = 0
    if write(catalog_path, catalog):
        changed += 1
    zone_totals = Counter()
    for zone, info in manifest["zones"].items():
        path = CAT / info["file"]
        local = load(path)
        updated = []
        for row in local:
            master = by_id.get(row["id"])
            assert master is not None and zone in master["zones"], "District catalog integrity error"
            if "glutenFree" in master:
                row["glutenFree"] = master["glutenFree"]
                zone_totals[zone] += 1
            else:
                row.pop("glutenFree", None)
            updated.append(row)
        assert len(updated) == info["count"]
        if write(path, updated):
            changed += 1
    report = {
        "schemaVersion": 1, "auditDate": STAMP, "catalogTotal": len(catalog),
        "categoriesCovered": ["restaurant", "cafe", "bar", "bakery", "pastry", "other food venues"],
        "method": "OpenStreetMap explicit diet tags and precise Overture gluten_free categories",
        "totalWithSourcedOffer": sum(stats[s] for s in ("osm_explicit","overture_category","previously_sourced")),
        "totalDocumentarilyVerifiedForCoeliacs": stats["reviewed"],
        "withoutEvidence": stats["no_evidence"], "evidenceCounts": dict(stats),
        "osmMatchedTagRecordsInArea": len(osm), "osmQueryIssue": problem,
        "samples": examples, "zonesWithOffer": dict(zone_totals),
        "caveat": "A listed gluten-free offer is NOT evidence of coeliac-safe preparation, accreditation, or no cross-contact. No protected certification logo used.",
        "googlePlacesChecked": 0,
    }
    manifest["glutenFreeAudit"]={
        "date": STAMP,
        "sourcedOfferCount": report["totalWithSourcedOffer"],
        "verifiedForCoeliacsCount": report["totalDocumentarilyVerifiedForCoeliacs"],
        "hasOSMQueryError": problem is not None,
    }
    if write(manifest_path, manifest):
        changed += 1
    write(CAT / "gluten-auditoria.json", report)
    print(json.dumps({"total":len(catalog),"offer":report["totalWithSourcedOffer"],
        "certified":report["totalDocumentarilyVerifiedForCoeliacs"],
        "osmMatches":stats["osm_explicit"],"overtureMatches":stats["overture_category"],
        "sourceProblem":problem,"modifiedFiles":changed},ensure_ascii=False))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"],"a",encoding="utf-8") as out:
            out.write("### Gluten-free audit\n\n")
            out.write(str(report["totalWithSourcedOffer"])+" source-reported options, ")
            out.write(str(report["totalDocumentarilyVerifiedForCoeliacs"])+" coeliac-safety verified. ")
            out.write("These are not equivalent.\n\n")
            if problem:
                out.write("OpenStreetMap query failed: "+problem+"\n")

if __name__ == "__main__":
    main()
