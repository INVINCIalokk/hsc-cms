module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: "aws-s3",
      providerOptions: {
        s3Options: {
          credentials: {
            accessKeyId: env("AWS_ACCESS_KEY_ID"),
            secretAccessKey: env("AWS_ACCESS_SECRET"),
          },
          region: env("AWS_REGION", "ap-south-1"),
          params: {
            Bucket: env("AWS_BUCKET"),
            // ACL: 'public-read', // Uncomment if public ACL is used
          },
        },
        // Optional: If using Amazon CloudFront CDN, provide the distribution domain
        baseUrl: env("AWS_CDN_URL"), // e.g. "https://d123456.cloudfront.net" or leave undefined
        rootPath: env("AWS_ROOT_PATH", "uploads"),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
});
