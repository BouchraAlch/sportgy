from fastapi import FastAPI

from app.core.supabase import supabase


app = FastAPI(title="SportGy API")


@app.get("/")
def root():
    return {"message": "SportGy API is running"}


@app.get("/supabase-test")
def supabase_test():
    response = supabase.table("profiles").select("*").limit(1).execute()

    return {
        "connected": True,
        "data": response.data,
    }