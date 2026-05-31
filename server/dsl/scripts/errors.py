class BlockDslError(Exception):
    """Base exception for block DSL failures."""


class AnnotationSyntaxError(BlockDslError):
    """Raised when # @block annotations cannot be parsed."""


class ValidationError(BlockDslError):
    """Raised when resolved metadata is inconsistent."""


class UnknownMetadataKeyError(ValidationError):
    """Raised when metadata contains unsupported keys."""


class LabelPlaceholderError(ValidationError):
    """Raised when a block label references an unknown placeholder."""


class InstanceConfigError(ValidationError):
    """Raised when class instance configuration is incomplete or invalid."""
