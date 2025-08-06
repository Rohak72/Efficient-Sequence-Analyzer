from .auth_tools import *
from .denote_file import *
from enum import Enum

class FileType(Enum):
    input = "input"
    reference = "reference"
    results = "results"