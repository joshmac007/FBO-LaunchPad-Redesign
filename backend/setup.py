from setuptools import setup, find_packages

setup(
    name="fbo-launchpad-backend",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask",
        "flask-sqlalchemy",
        "flask-migrate",
        "psycopg2-binary",
        "python-dotenv",
        "apispec",
        "apispec-webframeworks",
        "marshmallow",
    ],
) 