import os
import yaml

CONFIG_PATH = os.getenv("APP_CONFIG", "config.yaml")

def load_config():
    with open(CONFIG_PATH, "r") as f:
        return yaml.safe_load(f)

config = load_config()