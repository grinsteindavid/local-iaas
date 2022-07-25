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
  HEALTH_CHECK = "HEALTH_CHECK",
}

const ProtocolRules: {
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
  HEALTH_CHECK: {
    protocol: "-1",
    fromPort: 0,
    toPort: 0,
    cidrBlocks: ["0.0.0.0/0"],
  },
};

const devSecurityGroup = new aws.ec2.SecurityGroup("dev-ssh", {
  ingress: [ProtocolRules.SSH],
});

const WebSecurityGroup = new aws.ec2.SecurityGroup("web-service", {
  ingress: [ProtocolRules.HTTP, ProtocolRules.HTTPS],
  egress: [ProtocolRules.HEALTH_CHECK],
});

const ubuntu14 = aws.getAmiOutput({
  filters: [
    {
      name: "name",
      values: ["ubuntu/images/hvm-ssd/ubuntu-trusty-14.04-amd64-server-*"],
    },
    { name: "virtualization-type", values: ["hvm"] },
  ],
  mostRecent: true,
  owners: ["099720109477"], // Canonical
});

// const targetGroup = new aws.lb.TargetGroup("main-tg", {
//   port: 80,
//   protocol: "HTTP",
//   vpcId: mainVPC.id,
//   targetType: "instance",
// });

const loadBalancer = new awsx.lb.ApplicationLoadBalancer("web-traffic", {
  securityGroups: [WebSecurityGroup.id],
  vpc: awsx.ec2.Vpc.getDefault(),
});

const listener = loadBalancer.createListener("web-listener", { port: 80 });

const primaryZone = new aws.route53.Zone("primary");

const wwwSubdomain = new aws.route53.Record("wwwSubdomain", {
  zoneId: primaryZone.id,
  name: "www.example.com",
  type: "A",
  records: [listener.endpoint.hostname],
});

const Maindomain = new aws.route53.Record("Maindomain", {
  zoneId: primaryZone.id,
  name: "example.com",
  type: "A",
  records: [listener.endpoint.hostname],
});

// const mainServer = new aws.ec2.Instance("main-server", {
//   instanceType: "t2.micro",
//   tags: { name: "main-server" },
//   ami: ubuntu14.id,
//   vpcSecurityGroupIds: [WebSecurityGroup.id],
// });

// const secondaryServer = new aws.ec2.Instance("secondary-server", {
//   instanceType: "t2.micro",
//   tags: { name: "main-server" },
//   ami: ubuntu14.id,
//   vpcSecurityGroupIds: [WebSecurityGroup.id],
// });

// listener.attachTarget("main-server", mainServer);
// listener.attachTarget("secondary-server", secondaryServer);


// const tgAttachment = new aws.lb.TargetGroupAttachment("", {
//   targetGroupArn: targetGroup.arn,
//   targetId: mainServer.arn,
// });

// // Create an AWS resource (S3 Bucket)
// const bucket = new aws.s3.Bucket("my-bucket");

// // Export the name of the bucket
// export const bucketName = bucket.id;
