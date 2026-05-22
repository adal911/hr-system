import os
from pymongo import MongoClient

_client = None


def get_db():
    global _client
    if _client is None:
        _client = MongoClient(os.environ.get("MONGODB_URI", "mongodb://localhost:27017"))
    return _client[os.environ.get("MONGODB_DB_NAME", "hr_dataroom")]
