"""
Mongo → JSON helpers.

PyMongo returns BSON ObjectId values that DRF's JSON renderer cannot encode.
`clean_mongo` recursively converts every ObjectId to its string form so a
document (or list of documents) can be returned directly in a Response.
"""
from bson import ObjectId


def clean_mongo(value):
    """Recursively convert ObjectId values to strings within dicts/lists."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [clean_mongo(v) for v in value]
    if isinstance(value, dict):
        return {k: clean_mongo(v) for k, v in value.items()}
    return value
