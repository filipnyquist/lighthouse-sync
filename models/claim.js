const logger = require('winston');

module.exports = (sequelize, { STRING, BOOLEAN, INTEGER, TEXT, DECIMAL }) => {
  const Claim = sequelize.define(
    'Claim',
    {
      address: {
        type   : STRING,
        default: null,
      },
      amount: {
        type   : DECIMAL(19, 8),
        default: null,
      },
      claimId: {
        type   : STRING,
        default: null,
      },
      claimSequence: {
        type   : INTEGER,
        default: null,
      },
      decodedClaim: {
        type   : BOOLEAN,
        default: null,
      },
      depth: {
        type   : INTEGER,
        default: null,
      },
      effectiveAmount: {
        type   : DECIMAL(19, 8),
        default: null,
      },
      hasSignature: {
        type   : BOOLEAN,
        default: null,
      },
      height: {
        type   : INTEGER,
        default: null,
      },
      hex: {
        type   : TEXT('long'),
        default: null,
      },
      name: {
        type   : STRING,
        default: null,
      },
      nout: {
        type   : INTEGER,
        default: null,
      },
      txid: {
        type   : STRING,
        default: null,
      },
      validAtHeight: {
        type   : INTEGER,
        default: null,
      },
      outpoint: {
        type   : STRING,
        default: null,
      },
      claimType: {
        type   : STRING,
        default: null,
      },
      certificateId: {
        type   : STRING,
        default: null,
      },
      author: {
        type   : STRING,
        default: null,
      },
      description: {
        type   : TEXT('long'),
        default: null,
      },
      language: {
        type   : STRING,
        default: null,
      },
      license: {
        type   : STRING,
        default: null,
      },
      licenseUrl: {
        type   : STRING,
        default: null,
      },
      nsfw: {
        type   : BOOLEAN,
        default: null,
      },
      preview: {
        type   : STRING,
        default: null,
      },
      thumbnail: {
        type   : STRING,
        default: null,
      },
      title: {
        type   : STRING,
        default: null,
      },
      metadataVersion: {
        type   : STRING,
        default: null,
      },
      contentType: {
        type   : STRING,
        default: null,
      },
      source: {
        type   : STRING,
        default: null,
      },
      sourceType: {
        type   : STRING,
        default: null,
      },
      sourceVersion: {
        type   : STRING,
        default: null,
      },
      streamVersion: {
        type   : STRING,
        default: null,
      },
      valueVersion: {
        type   : STRING,
        default: null,
      },
      channelName: {
        type     : STRING,
        allowNull: true,
        default  : null,
      },
    },
    {
      freezeTableName: true,
    }
  );

    // add an 'upsert' method to the db object
    Claim.upsert = function (values, condition) {
        const that = this;
        return that
            .findOne({ where: condition })
            .then(obj => {
                if (obj) {
                    // update
                    logger.debug(`updating record in db.Claim`);
                    return obj.update(values);
                } else {
                    // insert
                    logger.debug(`creating record in db.Claim`);
                    return that.create(values);
                }
            })
            .catch(function (error) {
                logger.error(`Claim.upsert error`, error);
            });
    };

  return Claim;
};
