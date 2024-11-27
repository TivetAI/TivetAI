# Presigning

## Endpoint types

See documentation on the endpoint types at `s3_util::EndpointKind`.

## Presigning requests

Make sure you understand [presigning S3 requests](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) before reading this.

Presigned requests need to be made built `EndpointKind::External` in order to ensure the origin is a public endpoint.

Sometimes you need to create two separate clients: one with `EndpointKind::Internal` for making requests to S3 and one with `EndpointKind::External` for presigning requests.

## Edge caching

Tivet edge clusters can optionally run a pull-through S3 cache to acceelrate requests. See `tivet_config::server::tivet::BuildDeliveryMethod` for how this is configured with Dynamic Servers.

Requests via the edge cache are automatically authenticated to the S3 origin. Do not use presigned requests with the edge cache.



