import os
import json
import requests
import openai
from typing import Dict, List, Optional, Any
from utils.logger import logger


class AIServiceError(Exception):
    """Custom exception for AI service errors"""
    pass


class AIService:
    """
    Configurable AI service that supports multiple providers:
    - Perplexity AI (for news collection)
    - OpenAI (for content editing)
    - DeepSeek (future support)
    - Other providers can be easily added
    """

    def __init__(self):
        self.providers = {
            'perplexity': self._call_perplexity,
            'openai': self._call_openai,
            'deepseek': self._call_deepseek,
        }

    def call(self, provider: str, **kwargs) -> Dict[str, Any]:
        """
        Main method to call any AI provider
        
        Args:
            provider: The AI provider to use ('perplexity', 'openai', 'deepseek')
            **kwargs: Provider-specific parameters
            
        Returns:
            Dict containing the AI response
            
        Raises:
            AIServiceError: If provider is not supported or API call fails
        """
        if provider not in self.providers:
            raise AIServiceError(f"Unsupported AI provider: {provider}. Supported: {list(self.providers.keys())}")
        
        logger.info(f"Making AI API call to {provider}", provider=provider)
        
        try:
            return self.providers[provider](**kwargs)
        except Exception as e:
            logger.error(f"AI API call failed for {provider}", provider=provider, error=str(e))
            raise AIServiceError(f"Failed to call {provider}: {str(e)}")

    def _call_perplexity(self, 
                        prompt: str, 
                        model: str = "sonar-pro", 
                        temperature: float = 0.2, 
                        max_tokens: int = 4000,
                        timeout: int = 30) -> Dict[str, Any]:
        """
        Call Perplexity AI API
        
        Args:
            prompt: The prompt to send
            model: Perplexity model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            timeout: Request timeout in seconds
            
        Returns:
            Dict containing the response content and metadata
        """
        api_key = os.environ.get("PERPLEXITY_API_KEY")
        if not api_key:
            raise AIServiceError("PERPLEXITY_API_KEY not found in environment variables")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.info(
            "Calling Perplexity AI",
            model=model,
            temperature=temperature,
            prompt_length=len(prompt)
        )

        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=payload,
            timeout=timeout,
        )

        if response.status_code != 200:
            raise AIServiceError(
                f"Perplexity AI API error: {response.status_code} - {response.text}"
            )

        response_data = response.json()
        content = response_data["choices"][0]["message"]["content"]
        
        logger.info(
            "Perplexity AI response received",
            response_length=len(content),
            status_code=response.status_code
        )

        return {
            "content": content,
            "model": model,
            "provider": "perplexity",
            "usage": response_data.get("usage", {}),
            "raw_response": response_data
        }

    def _call_openai(self, 
                    messages: List[Dict[str, str]], 
                    model: str = "gpt-4", 
                    temperature: float = 0.7, 
                    max_tokens: int = 3000) -> Dict[str, Any]:
        """
        Call OpenAI API
        
        Args:
            messages: List of message objects with 'role' and 'content'
            model: OpenAI model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            
        Returns:
            Dict containing the response content and metadata
        """
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise AIServiceError("OPENAI_API_KEY not found in environment variables")

        client = openai.OpenAI(api_key=api_key)

        logger.info(
            "Calling OpenAI",
            model=model,
            temperature=temperature,
            messages_count=len(messages)
        )

        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        content = response.choices[0].message.content
        
        logger.info(
            "OpenAI response received",
            response_length=len(content),
            model=model
        )

        return {
            "content": content,
            "model": model,
            "provider": "openai",
            "usage": response.usage.model_dump() if response.usage else {},
            "raw_response": response
        }

    def _call_deepseek(self, 
                      prompt: str, 
                      model: str = "deepseek-chat", 
                      temperature: float = 0.7, 
                      max_tokens: int = 3000) -> Dict[str, Any]:
        """
        Call DeepSeek API (placeholder implementation)
        
        Args:
            prompt: The prompt to send
            model: DeepSeek model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens in response
            
        Returns:
            Dict containing the response content and metadata
        """
        api_key = os.environ.get("DEEPSEEK_API_KEY")
        if not api_key:
            raise AIServiceError("DEEPSEEK_API_KEY not found in environment variables")

        # Placeholder implementation - adjust based on actual DeepSeek API
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.info(
            "Calling DeepSeek",
            model=model,
            temperature=temperature,
            prompt_length=len(prompt)
        )

        # Note: Replace with actual DeepSeek API endpoint when available
        response = requests.post(
            "https://api.deepseek.com/v1/chat/completions",  # Placeholder URL
            headers=headers,
            json=payload,
            timeout=30,
        )

        if response.status_code != 200:
            raise AIServiceError(
                f"DeepSeek API error: {response.status_code} - {response.text}"
            )

        response_data = response.json()
        content = response_data["choices"][0]["message"]["content"]
        
        logger.info(
            "DeepSeek response received",
            response_length=len(content),
            status_code=response.status_code
        )

        return {
            "content": content,
            "model": model,
            "provider": "deepseek",
            "usage": response_data.get("usage", {}),
            "raw_response": response_data
        }

    def add_provider(self, name: str, handler_func):
        """
        Add a new AI provider
        
        Args:
            name: Provider name
            handler_func: Function that handles API calls for this provider
        """
        self.providers[name] = handler_func
        logger.info(f"Added new AI provider: {name}")

    def get_available_providers(self) -> List[str]:
        """
        Get list of available AI providers
        
        Returns:
            List of provider names
        """
        return list(self.providers.keys())


# Global instance for easy importing
ai_service = AIService()


# Convenience functions for backward compatibility and ease of use
def call_perplexity(prompt: str, **kwargs) -> str:
    """
    Convenience function to call Perplexity and return just the content
    
    Args:
        prompt: The prompt to send
        **kwargs: Additional parameters for Perplexity API
        
    Returns:
        The response content as string
    """
    result = ai_service.call('perplexity', prompt=prompt, **kwargs)
    return result['content']


def call_openai(messages: List[Dict[str, str]], **kwargs) -> str:
    """
    Convenience function to call OpenAI and return just the content
    
    Args:
        messages: List of message objects
        **kwargs: Additional parameters for OpenAI API
        
    Returns:
        The response content as string
    """
    result = ai_service.call('openai', messages=messages, **kwargs)
    return result['content']


def call_deepseek(prompt: str, **kwargs) -> str:
    """
    Convenience function to call DeepSeek and return just the content
    
    Args:
        prompt: The prompt to send
        **kwargs: Additional parameters for DeepSeek API
        
    Returns:
        The response content as string
    """
    result = ai_service.call('deepseek', prompt=prompt, **kwargs)
    return result['content']