from setuptools import setup, find_packages

setup(
    name='egydead-cli',
    version='1.0.0',
    description='CLI tool to search and extract direct download URLs from EgyDead',
    packages=find_packages(),
    python_requires='>=3.8',
    entry_points={
        'console_scripts': [
            'egydead=egydead.cli:main',
        ],
    },
)
