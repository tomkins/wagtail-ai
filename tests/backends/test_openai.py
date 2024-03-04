from typing import cast
from unittest.mock import ANY, Mock

import pytest
from wagtail.images.models import Image
from wagtail_ai.ai import get_ai_backend, get_backend
from wagtail_ai.ai.base import BackendFeature
from wagtail_ai.ai.openai import OpenAIBackend
from wagtail_factories import ImageFactory

pytestmark = pytest.mark.django_db

MOCK_API_KEY = "MOCK-API-KEY"


@pytest.fixture(autouse=True)
def stub_image_title_signal(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        "wagtail_ai.ai.openai.OpenAIBackend.get_openai_api_key",
        lambda self: MOCK_API_KEY,
    )


@pytest.fixture
def mock_post(monkeypatch: pytest.MonkeyPatch):
    mock = Mock()
    monkeypatch.setattr("requests.post", mock)
    return mock


def test_get_as_image_backend(settings):
    settings.WAGTAIL_AI = {
        "BACKENDS": {
            "openai": {
                "CLASS": "wagtail_ai.ai.openai.OpenAIBackend",
                "CONFIG": {
                    "MODEL_ID": "mock model",
                    "TOKEN_LIMIT": 123123,
                    "TIMEOUT_SECONDS": 321,
                },
            },
        },
        "IMAGE_DESCRIPTION_BACKEND": "openai",
    }

    backend = get_backend(BackendFeature.IMAGE_DESCRIPTION)
    assert isinstance(backend, OpenAIBackend)
    assert backend.config.model_id == "mock model"
    assert backend.config.token_limit == 123123
    assert backend.config.timeout_seconds == 321


def test_describe_image(settings, mock_post):
    settings.WAGTAIL_AI = {
        "BACKENDS": {
            "openai": {
                "CLASS": "wagtail_ai.ai.openai.OpenAIBackend",
                "CONFIG": {
                    "MODEL_ID": "mock model",
                    "TOKEN_LIMIT": 123123,
                },
            },
        },
    }

    mock_post.return_value.json.return_value = {
        "choices": [{"message": {"content": "nothing"}}],
    }
    image = cast(Image, ImageFactory())
    backend = get_ai_backend("openai")
    prompt = "what do you see?"

    description = backend.describe_image(image_file=image.file, prompt=prompt)
    assert description == "nothing"

    headers = mock_post.call_args.kwargs["headers"]
    assert headers["Authorization"] == f"Bearer {MOCK_API_KEY}"

    messages = mock_post.call_args.kwargs["json"]["messages"]
    assert messages == [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": ANY}},
            ],
        }
    ]
    url = messages[0]["content"][1]["image_url"]["url"]
    assert url.startswith("data:image/jpeg;base64,")
