// ==========================================
// 1. تشغيل سيرفر الـ Keep-Alive
// ==========================================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Boxtar Bot is active! 🚀');
});

app.get('/ping', (req, res) => {
  res.status(200).send('PONG');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// ==========================================
// 2. كود بوت ديسكورد الشامل والكامل بجميع الأنظمة
// ==========================================
const { 
  Client, 
  GatewayIntentBits, 
  SlashCommandBuilder, 
  REST, 
  Routes, 
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');

const { createCanvas, loadImage } = require('@napi-rs/canvas');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

const afkUsers = new Map();
const logChannels = new Map();
const ticketData = new Map();         
const ticketSettings = new Map();     
const applicationsData = new Map();
const customShortcuts = new Map();    
const commandRoles = new Map();        

const levelSettings = new Map();   
const userLevels = new Map();      
const levelRoles = new Map();      

const azkarSettings = new Map();
const protectionSettings = new Map();

// تخزين بيانات السجن المتقدمة لكل سيرفر
const jailSettings = new Map(); // guildId -> { roleId, jailerRoleId, textChannelId, logChannelId }
const jailedUsers = new Map();  // `${guildId}_${userId}` -> array of removed role IDs

const badWordsDB = new Map(); 
const badWordsPunishment = new Map(); 

const azkarList = [
  "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ العَظِيمِ.",
  "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ العَلِيِّ العَظِيمِ.",
  "أَسْتَغْفِرُ اللَّهَ العَظِيمَ وَأَتُوبُ إِلَيْهِ.",
  "لَا إِلَهَ إِلَّا اللَّه وحدَهُ لا شريكَ لهُ، لهُ الملكُ ولهُ الحمدُ وهوَ على كلِّ شيءٍ قديرٌ.",
  "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ."
];

const commands = [
  new SlashCommandBuilder()
    .setName('admin-setup')
    .setDescription('تحديد الرتب المصرح لها باستخدام الأوامر الإدارية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('shortcut')
    .setDescription('لوحة أزرار تفاعلية لإنشاء وإدارة اختصارات جميع الأوامر الإدارية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('تقديم').setDescription('إدارة وتخصيص لوحات التقديم الأربعة'),
  new SlashCommandBuilder().setName('ticket-setup').setDescription('تخصيص وإعداد لوحة الدعم والتذاكر'),
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('إعداد وتحديد قنوات السجلات الخاصة والإجراءات والتذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('level-setup')
    .setDescription('إعداد وتخصيص نظام اللفلات، معادلة الـ XP، ورتب المكافآت')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('level')
    .setDescription('عرض بطاقة اللفل المصورة وإحصائيات الـ XP')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض لفله').setRequired(false)),

  new SlashCommandBuilder()
    .setName('afk')
    .setDescription('تفعيل وضع الغياب AFK')
    .addStringOption(opt => opt.setName('سبب').setDescription('سبب الغياب (اختياري)').setRequired(false)),

  new SlashCommandBuilder()
    .setName('bad-words')
    .setDescription('لوحة التحكم الكاملة بالكلمات المحظورة والعقوبات التلقائية')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('azkar-setup')
    .setDescription('إعداد وتفعيل نظام الأذكار التلقائية في السيرفر')
    .addChannelOption(opt => opt.setName('القناة').setDescription('اختر قناة الأذكار').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('الساعات')
        .setDescription('الفاصل الزمني بين كل ذكر والآخر بالساعات')
        .setRequired(true)
        .addChoices(
          { name: 'ساعة واحدة', value: 1 },
          { name: 'ساعتان', value: 2 },
          { name: '3 ساعات', value: 3 },
          { name: '6 ساعات', value: 6 },
          { name: '12 ساعة', value: 12 },
          { name: '24 ساعة (يومياً)', value: 24 }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder().setName('azkar').setDescription('إرسال ذكر عشوائي فوراً في القناة الحالية'),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('حظر عضو من السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد حظره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الحظر').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('طرد عضو من السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد طرده').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الطرد').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('كتم عضو مؤقتاً')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد كتمه').setRequired(true))
    .addIntegerOption(opt => 
      opt.setName('المدة')
        .setDescription('حدد مدة الكتم')
        .setRequired(true)
        .addChoices(
          { name: '5 دقائق', value: 5 * 60 * 1000 },
          { name: '10 دقائق', value: 10 * 60 * 1000 },
          { name: '1 ساعة', value: 60 * 60 * 1000 },
          { name: '1 يوم', value: 24 * 60 * 60 * 1000 },
          { name: '1 أسبوع', value: 7 * 24 * 60 * 60 * 1000 }
        )
    )
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب الكتم').setRequired(true)),

  new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('إلغاء الكتم المؤقت عن العضو')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب رفع الكتم').setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('إرسال تحذير إداري لعضو')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المراد تحذيره').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('أدخل سبب التحذير').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('إزالة التحذيرات عن العضو')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true)),

  new SlashCommandBuilder()
    .setName('nick')
    .setDescription('تغيير لقب العضو في السيرفر')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو').setRequired(true))
    .addStringOption(opt => opt.setName('اللقب_الجديد').setDescription('اكتب اللقب الجديد').setRequired(true)),

  new SlashCommandBuilder()
    .setName('protection')
    .setDescription('لوحة إعدادات حماية السيرفر (السبام والروابط)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('jail-setup')
    .setDescription('لوحة إعداد نظام السجن الشامل (رتبة السجين، رتبة السجان، روم الكتابة، وسجل السجن)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('jail')
    .setDescription('سجن عضو وسحب كافة رتبه وتوثيق السجل')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو المسجون').setRequired(true))
    .addStringOption(opt => opt.setName('السبب').setDescription('سبب السجن').setRequired(true)),

  new SlashCommandBuilder()
    .setName('unjail')
    .setDescription('إفراج عن عضو مسجون وإعادة رتبه السابقة')
    .addUserOption(opt => opt.setName('العضو').setDescription('حدد العضو للإفراج عنه').setRequired(true)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('مسح عدد محدد من الرسائل في الروم')
    .addIntegerOption(opt => opt.setName('العدد').setDescription('من 1 إلى 100').setRequired(true)),
  
  new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالية'),
  new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم الحالية'),
  new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('عرض صورة الحساب')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض صورته').setRequired(false)),

  new SlashCommandBuilder()
    .setName('user-info')
    .setDescription('عرض تفاصيل الحساب')
    .addUserOption(opt => opt.setName('العضو').setDescription('اختر العضو لعرض معلوماته').setRequired(false)),

  new SlashCommandBuilder().setName('server-info').setDescription('عرض معلومات السيرفر'),
  new SlashCommandBuilder().setName('help').setDescription('يعرض لك قائمة بجميع أوامر البوت ووظائفها')
];

async function sendLog(guild, logType, title, color, fields) {
  const guildLogs = logChannels.get(guild.id);
  if (!guildLogs || !guildLogs[logType]) return;
  const channel = guild.channels.cache.get(guildLogs[logType]);
  if (!channel) return;

  const logEmbed = new EmbedBuilder()
    .setTitle(title)
    .addFields(fields)
    .setColor(color)
    .setTimestamp();

  await channel.send({ embeds: [logEmbed] }).catch(() => {});
}

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName, options, guild, member, channel } = interaction;

      if (commandName === 'help') {
        const helpEmbed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('🤖 دليل وقائمة أوامر بوت Boxtar الشاملة')
          .setDescription('أهلاً بك يا عمرو! إليك قائمة بجميع الأوامر والأنظمة المتاحة في البوت:')
          .addFields(
            { 
              name: '⛓️ نظام السجن المتكامل والمحدث', 
              value: '`/jail-setup` : لوحة إعداد رتبة السجين، رتبة السجان، روم الكتابة الخاصة بالسجناء، وسجل السجن.\n' +
                     '`/jail` : سجن عضو، سحب كافة رتبه وتوثيق العملية في سجل السجن.\n' +
                     '`/unjail` : فك سجن العضو وإعادة جميع رتبه السابقة.', 
              inline: false 
            },
            { 
              name: '🛡️ الأوامر الإدارية والحماية', 
              value: '`/protection` : إعدادات حماية السبام والروابط.\n' +
                     '`/bad-words` : لوحة الكلمات المحظورة بالأزرار.\n' +
                     '`/shortcut` : لوحة أزرار اختصارات جميع الأوامر.\n' +
                     '`/ban` / `/kick` / `/timeout` / `/warn`', 
              inline: false 
            }
          )
          .setFooter({ text: 'تم البرمجة والتطوير بواسطة Boxtar System' })
          .setTimestamp();

        return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      }

      if (commandName === 'bad-words') {
        await interaction.deferReply({ ephemeral: true });
        const currentPunish = badWordsPunishment.get(guild.id) || 'delete';
        const wordsSet = badWordsDB.get(guild.id) || new Set();

        const embed = new EmbedBuilder()
          .setTitle('🚫 لوحة تحكم الكلمات المحظورة (Bad Words)')
          .setDescription(`إجمالي الكلمات: **${wordsSet.size}**\nالعقوبة: \`${currentPunish.toUpperCase()}\``)
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_add_word').setLabel('إضافة كلمة').setEmoji('➕').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('bw_list_words').setLabel('عرض الكلمات').setEmoji('📋').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('bw_set_punishment').setLabel('تحديد العقوبة').setEmoji('⚖️').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_remove_word').setLabel('إزالة كلمة').setEmoji('➖').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('bw_clear_all').setLabel('إفراغ الكل').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'shortcut') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('⚡ لوحة إدارة اختصارات الأوامر الإدارية')
          .setDescription('اختر الإجراء أدناه لإدارة الاختصارات:')
          .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('sc_create').setLabel('إنشاء اختصار جديد').setEmoji('🔗').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('sc_list').setLabel('عرض الاختصارات').setEmoji('📜').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('sc_delete').setLabel('حذف اختصار').setEmoji('❌').setStyle(ButtonStyle.Danger)
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'protection') {
        await interaction.deferReply({ ephemeral: true });
        const currentProt = protectionSettings.get(guild.id) || { antiSpam: false, antiLinks: false };

        const embed = new EmbedBuilder()
          .setTitle('🛡️ لوحة نظام الحماية الفعّال')
          .setDescription('تحكم بحماية السيرفر عبر الأزرار أدناه:')
          .addFields(
            { name: '🚫 حماية الروابط:', value: currentProt.antiLinks ? '✅ **مفعل**' : '❌ **متوقف**', inline: true },
            { name: '⚡ حماية السبام:', value: currentProt.antiSpam ? '✅ **مفعل**' : '❌ **متوقف**', inline: true }
          )
          .setColor(0xE74C3C);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prot_toggle_links').setLabel(currentProt.antiLinks ? 'إيقاف حماية الروابط' : 'تفعيل حماية الروابط').setStyle(currentProt.antiLinks ? ButtonStyle.Danger : ButtonStyle.Success),
          new ButtonBuilder().setCustomId('prot_toggle_spam').setLabel(currentProt.antiSpam ? 'إيقاف حماية السبام' : 'تفعيل حماية السبام').setStyle(currentProt.antiSpam ? ButtonStyle.Danger : ButtonStyle.Success)
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      // ==========================================
      // لوحة إعدادات السجن المحدثة (Jail Setup)
      // ==========================================
      if (commandName === 'jail-setup') {
        await interaction.deferReply({ ephemeral: true });
        const jSettings = jailSettings.get(guild.id) || {};

        const roleName = jSettings.roleId ? `<@&${jSettings.roleId}>` : 'غير محدد ❌';
        const jailerName = jSettings.jailerRoleId ? `<@&${jSettings.jailerRoleId}>` : 'غير محدد (الكل أو المشرفين) ⚠️';
        const textChanName = jSettings.textChannelId ? `<#${jSettings.textChannelId}>` : 'غير محدد ❌';
        const logChanName = jSettings.logChannelId ? `<#${jSettings.logChannelId}>` : 'غير محدد ❌';

        const embed = new EmbedBuilder()
          .setTitle('⛓️ لوحة إعداد نظام السجن المتكامل')
          .setDescription('قم بتخصيص إعدادات السجن عبر القوائم التفاعلية أدناه:')
          .addFields(
            { name: '🏷️ رتبة السجين:', value: roleName, inline: true },
            { name: '🛡️ رتبة السجان (المصرح لها بالسجن):', value: jailerName, inline: true },
            { name: '💬 روم كتابة السجناء:', value: textChanName, inline: true },
            { name: '📋 قناة سجل السجن:', value: logChanName, inline: true }
          )
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder().setCustomId('jail_set_role').setPlaceholder('1️⃣ اختر رتبة السجين...')
        );
        const row2 = new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder().setCustomId('jail_set_jailer_role').setPlaceholder('2️⃣ اختر رتبة السجان (المصرح لها)...')
        );
        const row3 = new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder().setCustomId('jail_set_text_channel').setPlaceholder('3️⃣ اختر روم الكتابة المخصصة للسجناء...').addChannelTypes(ChannelType.GuildText)
        );
        const row4 = new ActionRowBuilder().addComponents(
          new ChannelSelectMenuBuilder().setCustomId('jail_set_log_channel').setPlaceholder('4️⃣ اختر قناة سجل السجن (Log)...').addChannelTypes(ChannelType.GuildText)
        );

        return interaction.editReply({
          embeds: [embed],
          components: [row1, row2, row3, row4]
        });
      }

      // ==========================================
      // تنفيذ أمر السجن مع التحقق وسحب الرتب وتوثيق السجل
      // ==========================================
      if (commandName === 'jail') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const jSettings = jailSettings.get(guild.id);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود في السيرفر.', ephemeral: true });
        if (!jSettings || !jSettings.roleId) return interaction.reply({ content: '❌ لم يتم إعداد رتبة السجن بعد! استخدم `/jail-setup` أولاً.', ephemeral: true });

        // التحقق من صلاحية رتبة السجان إذا تم تحديدها
        if (jSettings.jailerRoleId && !member.permissions.has(PermissionFlagsBits.Administrator)) {
          if (!member.roles.cache.has(jSettings.jailerRoleId)) {
            return interaction.reply({ content: '❌ عذراً، أنت لا تمتلك رتبة السجان المصرح لها باستخدام هذا الأمر.', ephemeral: true });
          }
        }

        // جلب جميع رتب العضو عدا رتبة Everyone واستثناء رتبة السجن إن وجدت
        const memberRoles = targetMember.roles.cache
          .filter(r => r.id !== guild.id && r.id !== jSettings.roleId)
          .map(r => r.id);

        const removedRoleMentions = memberRoles.map(rId => `<@&${rId}>`).join(', ') || 'لا توجد رتب أُزيلت';

        // حفظ الرتب المسحوبة
        jailedUsers.set(`${guild.id}_${user.id}`, memberRoles);

        // سحب الرتب وإضافة رتبة السجن
        await targetMember.roles.remove(memberRoles).catch(() => {});
        await targetMember.roles.add(jSettings.roleId).catch(() => {});

        // توجيه العضو أو إرسال رسالة في روم كتابة السجناء إن وجدت
        if (jSettings.textChannelId) {
          const jailTextChan = guild.channels.cache.get(jSettings.textChannelId);
          if (jailTextChan) {
            jailTextChan.send(`🚨 مرحباً ${targetMember}، لقد تم زجك في السجن. السبب: **${reason}**`).catch(() => {});
          }
        }

        // إرسال السجل التفصيلي في قناة سجل السجن المحددة
        if (jSettings.logChannelId) {
          const logChan = guild.channels.cache.get(jSettings.logChannelId);
          if (logChan) {
            const jailLogEmbed = new EmbedBuilder()
              .setTitle('⛓️ سجل سجن عضو جديد')
              .setColor(0xE74C3C)
              .addFields(
                { name: '👤 العضو المسجون:', value: `${user.tag} (${user.id})`, inline: false },
                { name: '🛡️ الشخص الساجن (الإداري):', value: `${interaction.user.tag}`, inline: false },
                { name: '🏷️ الرتب التي تمت إزالتها:', value: removedRoleMentions, inline: false },
                { name: '📝 السبب:', value: reason, inline: false }
              )
              .setTimestamp();
            logChan.send({ embeds: [jailLogEmbed] }).catch(() => {});
          }
        }

        return interaction.reply({ content: `✅ تم سجن العضو **${user.tag}** بنجاح وتوثيق العملية في سجل السجن.`, ephemeral: true });
      }

      // ==========================================
      // تنفيذ أمر فك السجن وإعادة الرتب
      // ==========================================
      if (commandName === 'unjail') {
        const user = options.getUser('العضو');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const jSettings = jailSettings.get(guild.id);
        const savedRoles = jailedUsers.get(`${guild.id}_${user.id}`);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود في السيرفر.', ephemeral: true });
        if (!jSettings || !jSettings.roleId) return interaction.reply({ content: '❌ نظام السجن غير معدل.', ephemeral: true });

        // إزالة رتبة السجن
        await targetMember.roles.remove(jSettings.roleId).catch(() => {});

        // إعادة الرتب السابقة إن وجدت
        if (savedRoles && savedRoles.length > 0) {
          await targetMember.roles.add(savedRoles).catch(() => {});
          jailedUsers.delete(`${guild.id}_${user.id}`);
        }

        // توثيق الإفراج في سجل السجن إن وجد
        if (jSettings.logChannelId) {
          const logChan = guild.channels.cache.get(jSettings.logChannelId);
          if (logChan) {
            const unjailEmbed = new EmbedBuilder()
              .setTitle('🔓 سجل الإفراج عن مسجون')
              .setColor(0x2ECC71)
              .addFields(
                { name: '👤 العضو المُفرج عنه:', value: `${user.tag}`, inline: true },
                { name: '🛡️ بواسطة الإداري:', value: `${interaction.user.tag}`, inline: true }
              )
              .setTimestamp();
            logChan.send({ embeds: [unjailEmbed] }).catch(() => {});
          }
        }

        return interaction.reply({ content: `✅ تم فك سجن العضو **${user.tag}** وإعادة رتبه السابقة بنجاح.`, ephemeral: true });
      }

      if (commandName === 'nick') {
        const user = options.getUser('العضو');
        const newNick = options.getString('اللقب_الجديد');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        await targetMember.setNickname(newNick).catch(() => {});
        return interaction.reply({ content: `✅ تم تغيير لقب العضو ${user.tag} إلى **${newNick}** بنجاح.`, ephemeral: true });
      }

      if (commandName === 'untimeout') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);

        if (!targetMember) return interaction.reply({ content: '❌ العضو غير موجود.', ephemeral: true });
        await targetMember.timeout(null, reason).catch(() => {});
        return interaction.reply({ content: `✅ تم رفع الكتم عن العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'unwarn') {
        const user = options.getUser('العضو');
        return interaction.reply({ content: `✅ تم مسح كافة التحذيرات عن العضو **${user.tag}** بنجاح.`, ephemeral: true });
      }

      if (commandName === 'azkar-setup') {
        const targetChannel = options.getChannel('القناة');
        const hours = options.getInteger('الساعات');
        
        azkarSettings.set(guild.id, {
          channelId: targetChannel.id,
          intervalHours: hours,
          lastSent: Date.now()
        });

        const embed = new EmbedBuilder()
          .setTitle('📿 تم إعداد نظام الأذكار بنجاح!')
          .setDescription(`سيتم إرسال الأذكار تلقائياً في القناة ${targetChannel} كل **${hours} ساعات**.`)
          .setColor(0x2ECC71);

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (commandName === 'azkar') {
        const randomZikr = azkarList[Math.floor(Math.random() * azkarList.length)];
        const embed = new EmbedBuilder()
          .setTitle('📿 ذِكْرُ الله')
          .setDescription(`> **${randomZikr}**`)
          .setColor(0xE74C3C)
          .setFooter({ text: `طلب بواسطة ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'admin-setup') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('🛡️ لوحة التحكم بصلاحيات الأوامر الإدارية')
          .setDescription('اختر الأمر الإداري لتحديد رتبة معينة لاستخدامه:')
          .setColor(0xE74C3C);

        const menu = new StringSelectMenuBuilder()
          .setCustomId('select_admin_command')
          .setPlaceholder('اختر الأمر الإداري المراد ضبطه...')
          .addOptions(
            { label: 'حظر العضو (Ban)', value: 'ban', emoji: '🔨' },
            { label: 'طرد العضو (Kick)', value: 'kick', emoji: '👢' },
            { label: 'كتم مؤقت (Timeout)', value: 'timeout', emoji: '⏰' },
            { label: 'تحذير إداري (Warn)', value: 'warn', emoji: '⚠️' }
          );

        const row = new ActionRowBuilder().addComponents(menu);
        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'level-setup') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder()
          .setTitle('⭐ لوحة إعدادات نظام اللفلات (Levels)')
          .setDescription('اختر الإجراء لضبط التفاعل واللفلات في السيرفر:')
          .setColor(0xE74C3C);

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('lvl_set_formula').setLabel('تحديد الـ XP الأساسي').setEmoji('📈').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('lvl_set_reward').setLabel('ربط لفل برتبة').setEmoji('🎁').setStyle(ButtonStyle.Success)
        );
        return interaction.editReply({ embeds: [embed], components: [row1] });
      }

      if (commandName === 'level') {
        await interaction.deferReply();
        const targetUser = options.getUser('العضو') || interaction.user;
        const key = `${guild.id}_${targetUser.id}`;
        const userData = userLevels.get(key) || { xp: 0, level: 0, chatXp: 0, voiceXp: 0 };
        const settings = levelSettings.get(guild.id) || { baseMultiplier: 200 };
        const nextLevelXp = (userData.level + 1) * settings.baseMultiplier;

        try {
          const canvas = createCanvas(800, 260);
          const ctx = canvas.getContext('2d');

          ctx.fillStyle = '#0f0f12';
          ctx.beginPath();
          ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
          ctx.fill();

          ctx.fillStyle = '#1e1e24';
          ctx.beginPath();
          ctx.roundRect(240, 175, 510, 28, 14);
          ctx.fill();

          const percentage = Math.min(userData.xp / nextLevelXp, 1);
          const progressWidth = Math.max(percentage * 510, 28);
          
          const redGradient = ctx.createLinearGradient(240, 0, 750, 0);
          redGradient.addColorStop(0, '#ff2a2a');
          redGradient.addColorStop(1, '#990000');
          
          ctx.fillStyle = redGradient;
          ctx.beginPath();
          ctx.roundRect(240, 175, progressWidth, 28, 14);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 32px sans-serif';
          ctx.fillText(targetUser.username, 240, 65);

          ctx.fillStyle = '#ff4d4d';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(`LEVEL: ${userData.level}`, 240, 110);

          ctx.fillStyle = '#cccccc';
          ctx.font = '18px sans-serif';
          ctx.fillText(`XP: ${userData.xp} /${nextLevelXp}`, 400, 110);

          ctx.save();
          ctx.beginPath();
          ctx.arc(120, 130, 72, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();

          const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
          const avatar = await loadImage(avatarURL);
          ctx.drawImage(avatar, 48, 58, 144, 144);
          ctx.restore();

          const attachment = { attachment: canvas.toBuffer('image/png'), name: 'rank-card.png' };
          return interaction.editReply({ files: [attachment] });
        } catch (err) {
          console.error(err);
          return interaction.editReply({ content: `❌ حدث خطأ أثناء إنشاء بطاقة اللفل.` });
        }
      }

      if (commandName === 'ping') return interaction.reply({ content: `🏓 السرعة: **${client.ws.ping}ms**`, ephemeral: true });

      if (commandName === 'avatar') {
        const user = options.getUser('العضو') || interaction.user;
        const embed = new EmbedBuilder().setTitle(`🖼️ صورة ${user.username}`).setImage(user.displayAvatarURL({ dynamic: true, size: 1024 })).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'user-info') {
        const user = options.getUser('العضو') || interaction.user;
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        const embed = new EmbedBuilder()
          .setTitle(`👤 معلومات: ${user.username}`)
          .setThumbnail(user.displayAvatarURL())
          .addFields(
            { name: '🆔 الايدي:', value: user.id, inline: true },
            { name: '📅 إنشاء الحساب:', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: '📥 الانضمام:', value: targetMember ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'غير معروف', inline: true }
          )
          .setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'server-info') {
        const embed = new EmbedBuilder()
          .setTitle(`🏰 سيرفر: ${guild.name}`)
          .setThumbnail(guild.iconURL())
          .addFields(
            { name: '👑 المالك:', value: `<@${guild.ownerId}>`, inline: true },
            { name: '👥 الأعضاء:', value: `${guild.memberCount}`, inline: true },
            { name: '💬 الرومات:', value: `${guild.channels.cache.size}`, inline: true }
          )
          .setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed] });
      }

      if (commandName === 'clear') {
        const amount = options.getInteger('العدد');
        if (amount < 1 || amount > 100) return interaction.reply({ content: '❌ اختر عدداً بين 1 و 100.', ephemeral: true });
        await channel.bulkDelete(amount, true).catch(() => {});
        return interaction.reply({ content: `🧹 تم مسح **${amount}** رسالة.`, ephemeral: true });
      }

      if (commandName === 'lock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        return interaction.reply({ content: '🔒 **تم قفل الروم الحالية.**' });
      }
      if (commandName === 'unlock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
        return interaction.reply({ content: '🔓 **تم فتح الروم الحالية.**' });
      }

      if (commandName === 'ticket-setup') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder().setTitle('🎫 اعدادات التكت').setDescription('اعدادات التكت من هنا').setColor(0xE74C3C);
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('tk_edit_panel').setLabel('تعديل عنوان الـ panel').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('tk_send_embed').setLabel('ارسال اللوحة').setStyle(ButtonStyle.Success)
        );
        return interaction.editReply({ embeds: [embed], components: [row1] });
      }

      if (commandName === 'تقديم') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder().setTitle('📂 لوحة التقديمات الأربعة').setDescription('اختر التقديم لضبط إعداداته:').setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('app_cfg_1').setLabel('تقديم (1)').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('app_cfg_2').setLabel('تقديم (2)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('app_cfg_3').setLabel('تقديم (3)').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('app_cfg_4').setLabel('تقديم (4)').setStyle(ButtonStyle.Primary)
        );
        return interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (commandName === 'logs') {
        await interaction.deferReply({ ephemeral: true });
        const embed = new EmbedBuilder().setTitle('📑 إعداد السجلات الشاملة').setDescription('اختر نوع السجل وتحديد قناته:').setColor(0xE74C3C);
        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_log_ban').setLabel('سجل الباند 🔨').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('set_log_kick').setLabel('سجل الطرد 👢').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('set_log_timeout').setLabel('سجل التايم ⏰').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('set_log_warn').setLabel('سجل التحذير ⚠️').setStyle(ButtonStyle.Secondary)
        );
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('set_log_jail').setLabel('سجل السجن ⛓️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('set_log_ticket').setLabel('سجل التكت 🎫').setStyle(ButtonStyle.Success)
        );
        return interaction.editReply({ embeds: [embed], components: [row1, row2] });
      }

      if (commandName === 'afk') {
        const reason = options.getString('سبب') || 'لا يوجد سبب';
        afkUsers.set(interaction.user.id, { reason, timestamp: Date.now() });
        return interaction.reply({ content: `💤 تم تفعيل وضع AFK. السبب: **${reason}**` });
      }

      if (commandName === 'ban') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        await guild.members.ban(user.id, { reason });
        await sendLog(guild, 'ban', '🔨 سجل حظر جديد (Ban)', 0xE74C3C, [
          { name: '👤 العضو المحظور:', value: `${user.tag}` },
          { name: '🛡️ الإداري:', value: `${interaction.user.tag}` },
          { name: '📝 السبب:', value: reason }
        ]);
        return interaction.reply({ content: `✅ تم حظر العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'kick') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        await targetMember.kick(reason);
        await sendLog(guild, 'kick', '👢 سجل طرد جديد (Kick)', 0xE74C3C, [
          { name: '👤 العضو المطرود:', value: `${user.tag}` },
          { name: '🛡️ الإداري:', value: `${interaction.user.tag}` },
          { name: '📝 السبب:', value: reason }
        ]);
        return interaction.reply({ content: `✅ تم طرد العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'timeout') {
        const user = options.getUser('العضو');
        const duration = options.getInteger('المدة');
        const reason = options.getString('السبب');
        const targetMember = await guild.members.fetch(user.id).catch(() => null);
        await targetMember.timeout(duration, reason);
        await sendLog(guild, 'timeout', '⏰ سجل كتم مؤقت (Timeout)', 0xE74C3C, [
          { name: '👤 العضو المكتوم:', value: `${user.tag}` },
          { name: '🛡️ الإداري:', value: `${interaction.user.tag}` },
          { name: '📝 السبب:', value: reason }
        ]);
        return interaction.reply({ content: `✅ تم كتم العضو **${user.tag}**.`, ephemeral: true });
      }

      if (commandName === 'warn') {
        const user = options.getUser('العضو');
        const reason = options.getString('السبب');
        await sendLog(guild, 'warn', '⚠️ سجل تحذير جديد (Warn)', 0xE74C3C, [
          { name: '👤 العضو:', value: `${user.tag}` },
          { name: '🛡️ الإداري:', value: `${interaction.user.tag}` },
          { name: '📝 السبب:', value: reason }
        ]);
        return interaction.reply({ content: `✅ تم إصدار تحذير للعضو **${user.tag}**.`, ephemeral: true });
      }
    }

    // ==========================================
    // معالجة قوائم اختيار الرتب والقنوات لإعدادات السجن
    // ==========================================
    if (interaction.isRoleSelectMenu()) {
      if (interaction.customId === 'jail_set_role') {
        const roleId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.roleId = roleId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد رتبة السجين بنجاح: <@&${roleId}>`, ephemeral: true });
      }

      if (interaction.customId === 'jail_set_jailer_role') {
        const roleId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.jailerRoleId = roleId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد رتبة السجان (المصرح لها بالسجن) بنجاح: <@&${roleId}>`, ephemeral: true });
      }
    }

    if (interaction.isChannelSelectMenu()) {
      const id = interaction.customId;
      if (id.startsWith('select_channel_')) {
        const logType = id.replace('select_channel_', '');
        const selectedChannelId = interaction.values[0];
        if (!logChannels.has(interaction.guild.id)) logChannels.set(interaction.guild.id, {});
        logChannels.get(interaction.guild.id)[logType] = selectedChannelId;
        return interaction.reply({ content: `✅ تم تحديد قناة (${logType.toUpperCase()}) بنجاح!`, ephemeral: true });
      }

      if (id === 'jail_set_text_channel') {
        const channelId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.textChannelId = channelId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد روم كتابة السجناء بنجاح: <#${channelId}>`, ephemeral: true });
      }

      if (id === 'jail_set_log_channel') {
        const channelId = interaction.values[0];
        let current = jailSettings.get(interaction.guild.id) || {};
        current.logChannelId = channelId;
        jailSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `✅ تم تحديد قناة سجل السجن (Log) بنجاح: <#${channelId}>`, ephemeral: true });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'sc_select_command_menu') {
        const selectedOrigCmd = interaction.values[0];
        const modal = new ModalBuilder()
          .setCustomId(`sc_modal_save_${selectedOrigCmd}`)
          .setTitle(`إنشاء اختصار لـ /${selectedOrigCmd}`);

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('shortcut_alias_input')
              .setLabel('اكتب الاختصار (مثلاً: b أو k أو m)')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === 'bw_add_word') {
        const modal = new ModalBuilder().setCustomId('bw_modal_add').setTitle('إضافة كلمة ممنوعة جديدة');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('word_input').setLabel('اكتب الكلمة المراد حظرها').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }

      if (id === 'bw_list_words') {
        const wordsSet = badWordsDB.get(interaction.guild.id) || new Set();
        if (wordsSet.size === 0) return interaction.reply({ content: '❌ لا توجد أي كلمات ممنوعة مسجلة حالياً.', ephemeral: true });
        const wordsArray = Array.from(wordsSet).map((w, index) => `${index + 1}. \`${w}\``).join('\n');
        const embed = new EmbedBuilder().setTitle('📋 قائمة الكلمات المحظورة').setDescription(wordsArray).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (id === 'bw_set_punishment') {
        const embed = new EmbedBuilder().setTitle('⚖️ تحديد العقوبة التلقائية للكلمات الممنوعة').setDescription('اختر العقوبة المناسبة من الأزرار أدناه:').setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('bw_pun_delete').setLabel('حذف الرسالة').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('bw_pun_timeout').setLabel('كتم العضو').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('bw_pun_kick').setLabel('طرد العضو').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('bw_pun_ban').setLabel('حظر العضو').setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }

      if (id.startsWith('bw_pun_')) {
        const punType = id.replace('bw_pun_', '');
        badWordsPunishment.set(interaction.guild.id, punType);
        return interaction.reply({ content: `✅ تم تحديث عقوبة الكلمات الممنوعة إلى: **${punType.toUpperCase()}**`, ephemeral: true });
      }

      if (id === 'bw_remove_word') {
        const modal = new ModalBuilder().setCustomId('bw_modal_remove').setTitle('إزالة كلمة من القائمة');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('word_remove_input').setLabel('اكتب الكلمة المراد إزالتها').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }

      if (id === 'bw_clear_all') {
        badWordsDB.set(interaction.guild.id, new Set());
        badWordsPunishment.set(interaction.guild.id, 'delete');
        return interaction.reply({ content: '🗑️ تم إفراغ وإلغاء جميع الكلمات المحظورة.', ephemeral: true });
      }

      if (id === 'sc_create') {
        const embed = new EmbedBuilder()
          .setTitle('🔗 اختيار الأمر لعمل اختصار له')
          .setDescription('اختر الأمر الإداري من القائمة أدناه:')
          .setColor(0xE74C3C);

        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('sc_select_command_menu')
          .setPlaceholder('اختر الأمر الإداري...')
          .addOptions(
            { label: 'حظر (ban)', value: 'ban', emoji: '🔨' },
            { label: 'طرد (kick)', value: 'kick', emoji: '👢' },
            { label: 'كتم مؤقت (timeout)', value: 'timeout', emoji: '⏰' },
            { label: 'رفع الكتم (untimeout)', value: 'untimeout', emoji: '🔊' },
            { label: 'تحذير (warn)', value: 'warn', emoji: '⚠️' },
            { label: 'سجن (jail)', value: 'jail', emoji: '⛓️' },
            { label: 'إفراج السجن (unjail)', value: 'unjail', emoji: '🔓' },
            { label: 'مسح رسائل (clear)', value: 'clear', emoji: '🧹' }
          );

        return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
      }

      if (id === 'sc_list') {
        const guildShortcuts = Array.from(customShortcuts.entries()).filter(([k]) => k.startsWith(interaction.guild.id));
        if (guildShortcuts.length === 0) return interaction.reply({ content: '❌ لا توجد أي اختصارات مسجلة.', ephemeral: true });

        const listText = guildShortcuts.map(([key, orig]) => {
          const alias = key.replace(`${interaction.guild.id}_`, '');
          return `🔹 الاختصار: \`!${alias}\` ➡️ الأمر: \`/${orig}\``;
        }).join('\n');

        const embed = new EmbedBuilder().setTitle('📜 قائمة الاختصارات النشطة').setDescription(listText).setColor(0xE74C3C);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      if (id === 'sc_delete') {
        const modal = new ModalBuilder().setCustomId('sc_modal_delete_alias').setTitle('حذف اختصار');
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('alias_to_delete').setLabel('اكتب اسم الاختصار المراد حذفه').setStyle(TextInputStyle.Short).setRequired(true)
          )
        );
        return await interaction.showModal(modal);
      }

      if (id === 'prot_toggle_links') {
        let current = protectionSettings.get(interaction.guild.id) || { antiSpam: false, antiLinks: false };
        current.antiLinks = !current.antiLinks;
        protectionSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `🛡️ تم **${current.antiLinks ? 'تفعيل' : 'إيقاف'}** حماية الروابط.`, ephemeral: true });
      }

      if (id === 'prot_toggle_spam') {
        let current = protectionSettings.get(interaction.guild.id) || { antiSpam: false, antiLinks: false };
        current.antiSpam = !current.antiSpam;
        protectionSettings.set(interaction.guild.id, current);
        return interaction.reply({ content: `⚡ تم **${current.antiSpam ? 'تفعيل' : 'إيقاف'}** حماية السبام.`, ephemeral: true });
      }

      if (id === 'tk_edit_panel') {
        const modal = new ModalBuilder().setCustomId('save_ticket_panel').setTitle('تعديل عنوان ووصف الـ Panel');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tk_title').setLabel('عنوان التذكرة الرئيسي').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tk_desc').setLabel('الوصف / النص الداخلي').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      if (id === 'tk_send_embed') {
        const data = ticketData.get(interaction.guild.id);
        if (!data || !data.title) return interaction.reply({ content: '❌ يرجى تعديل عنوان الـ panel أولاً!', ephemeral: true });

        const embed = new EmbedBuilder().setTitle(data.title).setDescription(data.desc || 'اضغط لفتح تذكرة').setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket_btn').setLabel('فتح تذكرة').setEmoji('🎫').setStyle(ButtonStyle.Danger));

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '🚀 تم نشر لوحة التذاكر بنجاح!', ephemeral: true });
      }

      if (id === 'create_ticket_btn') {
        const modal = new ModalBuilder().setCustomId('ticket_reason_modal').setTitle('التذكرة');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_reason_input').setLabel('وضح طلبك باختصار:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id === 'close_ticket') {
        await interaction.reply({ content: '🔒 جاري إغلاق التذكرة وحفظ السجل...', ephemeral: true });
        await handleTicketCloseLog(interaction.channel, interaction.guild, interaction.user);
        await interaction.channel.delete().catch(() => {});
      }

      if (id.startsWith('app_cfg_')) {
        const appNum = id.replace('app_cfg_', '');
        const embed = new EmbedBuilder().setTitle(`⚙️ إعدادات التقديم رقم (${appNum})`).setDescription(`اضغط على الزر أدناه لتعديل الاسم والأسئلة:`).setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`app_edit_full_${appNum}`).setLabel('تعديل الأسئلة ✏️').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`app_send_room_${appNum}`).setLabel('نشر اللوحة 📤').setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
      }

      if (id.startsWith('app_edit_full_')) {
        const appNum = id.replace('app_edit_full_', '');
        const modal = new ModalBuilder().setCustomId(`save_app_modal_${appNum}`).setTitle(`تقديم (${appNum})`);
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('app_name').setLabel('اسم التقديم').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q1_input').setLabel('السؤال 1').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
      }

      if (id.startsWith('app_send_room_')) {
        const appNum = id.replace('app_send_room_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        if (!data) return interaction.reply({ content: '❌ يرجى ضبط إعدادات التقديم أولاً!', ephemeral: true });

        const embed = new EmbedBuilder().setTitle(`📋 ${data.name}`).setDescription('اضغط أدناه للتقديم:').setColor(0xE74C3C);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`start_apply_${appNum}`).setLabel(`تقديم`).setStyle(ButtonStyle.Danger));
        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: `✅ تم نشر لوحة (${data.name}) بنجاح!`, ephemeral: true });
      }

      if (id.startsWith('start_apply_')) {
        const appNum = id.replace('start_apply_', '');
        const data = applicationsData.get(`${interaction.guild.id}_${appNum}`);
        const modal = new ModalBuilder().setCustomId(`submit_apply_modal_${appNum}`).setTitle(data.name.substring(0, 45));
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('q_ans_1').setLabel(data.question || 'أجب هنا:').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        return await interaction.showModal(modal);
      }

      if (id.startsWith('set_log_')) {
        const logType = id.replace('set_log_', '');
        const selectMenu = new ChannelSelectMenuBuilder().setCustomId(`select_channel_${logType}`).setPlaceholder('اختر الروم المخصصة للسجل...').addChannelTypes(ChannelType.GuildText);
        return interaction.reply({ content: `📌 اختر القناة الخاصة بـ (${logType.toUpperCase()}):`, components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'bw_modal_add') {
        const newWord = interaction.fields.getTextInputValue('word_input').trim().toLowerCase();
        let wordsSet = badWordsDB.get(interaction.guild.id) || new Set();
        wordsSet.add(newWord);
        badWordsDB.set(interaction.guild.id, wordsSet);
        return interaction.reply({ content: `✅ تم إضافة الكلمة \`${newWord}\` للقائمة بنجاح!`, ephemeral: true });
      }

      if (interaction.customId === 'bw_modal_remove') {
        const wordToRemove = interaction.fields.getTextInputValue('word_remove_input').trim().toLowerCase();
        let wordsSet = badWordsDB.get(interaction.guild.id) || new Set();
        if (wordsSet.has(wordToRemove)) {
          wordsSet.delete(wordToRemove);
          badWordsDB.set(interaction.guild.id, wordsSet);
          return interaction.reply({ content: `✅ تم إزالة الكلمة \`${wordToRemove}\`.`, ephemeral: true });
        }
        return interaction.reply({ content: `❌ الكلمة غير موجودة.`, ephemeral: true });
      }

      if (interaction.customId.startsWith('sc_modal_save_')) {
        const origCmd = interaction.customId.replace('sc_modal_save_', '');
        const alias = interaction.fields.getTextInputValue('shortcut_alias_input').toLowerCase().trim().replace('!', '');
        customShortcuts.set(`${interaction.guild.id}_${alias}`, origCmd);
        return interaction.reply({ content: `⚡ تم إنشاء الاختصار بنجاح! \`!${alias}\` تنفذ الأمر \`/${origCmd}\`.`, ephemeral: true });
      }

      if (interaction.customId === 'sc_modal_delete_alias') {
        const alias = interaction.fields.getTextInputValue('alias_to_delete').toLowerCase().trim().replace('!', '');
        const key = `${interaction.guild.id}_${alias}`;
        if (customShortcuts.has(key)) {
          customShortcuts.delete(key);
          return interaction.reply({ content: `✅ تم حذف الاختصار \`!${alias}\`.`, ephemeral: true });
        }
        return interaction.reply({ content: `❌ الاختصار غير موجود.`, ephemeral: true });
      }

      if (interaction.customId === 'save_ticket_panel') {
        ticketData.set(interaction.guild.id, { title: interaction.fields.getTextInputValue('tk_title'), desc: interaction.fields.getTextInputValue('tk_desc') });
        return interaction.reply({ content: '✨ تم حفظ بيانات التذكرة بنجاح!', ephemeral: true });
      }

      if (interaction.customId === 'ticket_reason_modal') {
        const reason = interaction.fields.getTextInputValue('ticket_reason_input');
        const ticketChannel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            { id: interaction.guild.id, denied: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allowed: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
          ]
        });

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('إغلاق التذكرة').setStyle(ButtonStyle.Danger));
        await ticketChannel.send({ content: `${interaction.user}`, embeds: [new EmbedBuilder().setTitle('🎫 تذكرة جديدة').setDescription(`السبب: \`${reason}\``).setColor(0xE74C3C)], components: [row] });
        return interaction.reply({ content: `✅ تم إنشاء تذكرتك: ${ticketChannel}`, ephemeral: true });
      }

      if (interaction.customId.startsWith('save_app_modal_')) {
        const appNum = interaction.customId.replace('save_app_modal_', '');
        applicationsData.set(`${interaction.guild.id}_${appNum}`, { name: interaction.fields.getTextInputValue('app_name'), question: interaction.fields.getTextInputValue('q1_input') });
        return interaction.reply({ content: '✅ تم حفظ بيانات التقديم بنجاح!', ephemeral: true });
      }

      if (interaction.customId.startsWith('submit_apply_modal_')) {
        const answer = interaction.fields.getTextInputValue('q_ans_1');
        const embed = new EmbedBuilder().setTitle('📥 تقديم جديد').addFields({ name: '👤 المتقدم:', value: `${interaction.user}` }, { name: '📝 الإجابة:', value: answer }).setColor(0xE74C3C);
        await interaction.channel.send({ embeds: [embed] }).catch(() => {});
        return interaction.reply({ content: '✅ تم إرسال تقديمك بنجاح!', ephemeral: true });
      }
    }
  } catch (err) {
    console.error('خطأ في معالجة التفاعل:', err);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const wordsSet = badWordsDB.get(message.guild.id);
  if (wordsSet && wordsSet.size > 0 && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
    const contentLower = message.content.toLowerCase();
    let foundBadWord = false;
    for (const word of wordsSet) {
      if (contentLower.includes(word)) {
        foundBadWord = true;
        break;
      }
    }

    if (foundBadWord) {
      await message.delete().catch(() => {});
      const punishment = badWordsPunishment.get(message.guild.id) || 'delete';
      
      if (punishment === 'timeout') {
        await message.member.timeout(5 * 60 * 1000, 'استخدام كلمات محظورة').catch(() => {});
      } else if (punishment === 'kick') {
        await message.member.kick('استخدام كلمات محظورة').catch(() => {});
      } else if (punishment === 'ban') {
        await message.member.ban({ reason: 'استخدام كلمات محظورة' }).catch(() => {});
      }

      const warnMsg = await message.channel.send(`⚠️ ${message.author}، تم حذف رسالتك لاحتوائها على كلمات ممنوعة!`);
      setTimeout(() => warnMsg.delete().catch(() => {}), 4000);
      return;
    }
  }

  const prot = protectionSettings.get(message.guild.id);
  if (prot && prot.antiLinks) {
    if (message.content.includes('http://') || message.content.includes('https://') || message.content.includes('discord.gg/')) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.delete().catch(() => {});
        const warnMsg = await message.channel.send(`⚠️ ${message.author}، ممنوع إرسال الروابط!`);
        setTimeout(() => warnMsg.delete().catch(() => {}), 4000);
        return;
      }
    }
  }
});

async function handleTicketCloseLog(channel, guild, closedBy) {
  const guildLogs = logChannels.get(guild.id);
  if (!guildLogs || !guildLogs['ticket']) return;
  const logChannel = guild.channels.cache.get(guildLogs['ticket']);
  if (!logChannel) return;

  const logEmbed = new EmbedBuilder()
    .setTitle('🎫 سجل إغلاق التذكرة')
    .setColor(0xE74C3C)
    .addFields(
      { name: '📁 اسم التذكرة:', value: `\`${channel.name}\``, inline: true },
      { name: '🛡️ أُغلقت بواسطة:', value: `${closedBy.tag}`, inline: true }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
}

const TOKEN = process.env.TOKEN;
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
  console.log(`✅ تم تنشيط البوت بنجاح باسم: ${client.user.tag}`);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ تم تسجيل وتحديث كافة الأوامر والأنظمة بنجاح!');
  } catch (err) {
    console.error('❌ خطأ أثناء تسجيل الأوامر:', err);
  }
});

client.login(TOKEN);
