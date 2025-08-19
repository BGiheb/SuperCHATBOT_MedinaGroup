# key_manager.py
import itertools

def load_api_keys(file_path="api_keys.txt"):
    with open(file_path, "r") as f:
        keys = [line.strip() for line in f if line.strip()]
    if not keys:
        raise ValueError("No API keys found in api_keys.txt")
    return itertools.cycle(keys)  # cycle infini round-robin

# Initialisation du cycle
api_keys_cycle = load_api_keys()

def get_api_key():
    """Retourne la clé API suivante dans la liste (round-robin)."""
    return next(api_keys_cycle)
