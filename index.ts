import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const mainVPC = new aws.ec2.Vpc("main", {
  cidrBlock: "10.0.0.0/16",
});

enum Protocols {
    HTTP = "HTTP",
    HTTPS = "HTTPS",
    SSH = "SSH",
}

const ingress: {
  [key in Protocols]: aws.types.input.ec2.SecurityGroupIngress;
} = {
  SSH: { protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"] },
  HTTP: {
    protocol: "tcp",
    fromPort: 80,
    toPort: 80,
    cidrBlocks: ["0.0.0.0/0"],
  },
  HTTPS: {
    protocol: "tcp",
    fromPort: 443,
    toPort: 443,
    cidrBlocks: ["0.0.0.0/0"],
  },
};

const devSecurityGroup = new aws.ec2.SecurityGroup("dev-ssh", {
  ingress: [ingress.SSH],
});

const WebSecurityGroup = new aws.ec2.SecurityGroup("web-service", {
  ingress: [ingress.HTTP, ingress.HTTPS],
});

const ami = aws.getAmiOutput({
  filters: [{ name: "name", values: ["amzn-ami-hvm-*"] }],
  owners: ["137112412989"],
  mostRecent: true,
});

const targetGroup = new aws.lb.TargetGroup("main-tg", {
    port: 80,
    protocol: "HTTP",
    vpcId: mainVPC.id,
    targetType: "instance"
});

const loadBalancer = new aws.lb.LoadBalancer("main-lb", {
  internal: false,
  loadBalancerType: "application",
  securityGroups: [WebSecurityGroup.id],
});

const server = new aws.ec2.Instance("main-server", {
  instanceType: "t2.micro",
  tags: { name: "main-server" },
  ami: ami.id,
  vpcSecurityGroupIds: [WebSecurityGroup.id],
});


// // Create an AWS resource (S3 Bucket)
// const bucket = new aws.s3.Bucket("my-bucket");

// // Export the name of the bucket
// export const bucketName = bucket.id;
