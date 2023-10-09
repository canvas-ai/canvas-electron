FROM nvcr.io/nvidia/pytorch:22.12-py3

WORKDIR /workspace
EXPOSE 8000

CMD ["python", "-m", "vllm.entrypoints.openai.api_server", "--host", "0.0.0.0"]
